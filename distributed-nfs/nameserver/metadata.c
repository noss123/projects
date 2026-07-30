#include "metadata.h"

#define METADATA_SS_BUCKETS   256
#define METADATA_FILE_BUCKETS 1024
#define METADATA_USER_BUCKETS 256

#define FILE_PERM_READ  (1u << 0)
#define FILE_PERM_WRITE (1u << 1)

typedef struct FileAccessEntry {
	char username[UNAME_LENGTH];
	uint8_t perms;
	struct FileAccessEntry *next;
} FileAccessEntry;

typedef struct StorageServerEntry {
    StorageServerSnapshot snap;
    struct StorageServerEntry *next;
} StorageServerEntry;

typedef struct FileEntry {
    FileMetadataSnapshot snap;
    FileMetadataSnapshot undo_snap;
    int undo_valid;
    FileAccessEntry *acl_head;
    struct FileEntry *next;
} FileEntry;

typedef struct UserEntry {
    UserSnapshot snap;
    struct UserEntry *next;
} UserEntry;

typedef struct MetadataStore {
    StorageServerEntry *ss_buckets[METADATA_SS_BUCKETS];
    FileEntry *file_buckets[METADATA_FILE_BUCKETS];
    UserEntry *user_buckets[METADATA_USER_BUCKETS];
    pthread_rwlock_t ss_lock;
    pthread_rwlock_t file_lock;
    pthread_rwlock_t user_lock;
    char persist_path[PATH_MAX];
} MetadataStore;

#define FILE_CACHE_BUCKETS 256
#define FILE_CACHE_CAPACITY 128

typedef struct FileCacheEntry {
	char filename[FNAME_LENGTH];
	FileMetadataSnapshot file_snap;
	StorageServerSnapshot ss_snap;
	int has_ss;
	struct FileCacheEntry *hash_next;
	struct FileCacheEntry *lru_prev;
	struct FileCacheEntry *lru_next;
} FileCacheEntry;

typedef struct FileLookupCache {
	FileCacheEntry *buckets[FILE_CACHE_BUCKETS];
	FileCacheEntry *lru_head;
	FileCacheEntry *lru_tail;
	size_t size;
	pthread_mutex_t lock;
} FileLookupCache;

static MetadataStore g_store;
static FileLookupCache g_cache;
static uint32_t hash_string(const char *s);

static void cache_init(void);
static void cache_destroy(void);
static int cache_lookup(const char *filename,
                       FileMetadataSnapshot *out_file,
                       StorageServerSnapshot *out_ss,
                       int *out_has_ss);
static void cache_insert(const FileMetadataSnapshot *file_snap,
                         const StorageServerSnapshot *ss_snap,
                         int has_ss);
static void cache_invalidate(const char *filename);
static void cache_clear(void);

static void cache_attach_front(FileCacheEntry *entry) {
    entry->lru_prev = NULL;
    entry->lru_next = g_cache.lru_head;
    if (g_cache.lru_head) {
        g_cache.lru_head->lru_prev = entry;
    }
    g_cache.lru_head = entry;
    if (!g_cache.lru_tail) {
        g_cache.lru_tail = entry;
    }
}

static void cache_detach(FileCacheEntry *entry) {
    if (!entry) return;
    if (entry->lru_prev) {
        entry->lru_prev->lru_next = entry->lru_next;
    }
    if (entry->lru_next) {
        entry->lru_next->lru_prev = entry->lru_prev;
    }
    if (g_cache.lru_head == entry) {
        g_cache.lru_head = entry->lru_next;
    }
    if (g_cache.lru_tail == entry) {
        g_cache.lru_tail = entry->lru_prev;
    }
    entry->lru_prev = entry->lru_next = NULL;
}

static void cache_detach_from_bucket(FileCacheEntry *entry) {
    if (!entry) return;
    uint32_t bucket = hash_string(entry->filename) % FILE_CACHE_BUCKETS;
    FileCacheEntry **cur = &g_cache.buckets[bucket];
    while (*cur && *cur != entry) {
        cur = &(*cur)->hash_next;
    }
    if (*cur == entry) {
        *cur = entry->hash_next;
    }
    entry->hash_next = NULL;
}

static void cache_move_to_front(FileCacheEntry *entry) {
    if (!entry || g_cache.lru_head == entry) return;
    cache_detach(entry);
    cache_attach_front(entry);
}

static void cache_evict_tail(void) {
    FileCacheEntry *victim = g_cache.lru_tail;
    if (!victim) return;
    cache_detach(victim);
    cache_detach_from_bucket(victim);
    free(victim);
    if (g_cache.size > 0) {
        g_cache.size--;
    }
}

static void cache_init(void) {
    memset(&g_cache, 0, sizeof(g_cache));
    pthread_mutex_init(&g_cache.lock, NULL);
}

static void cache_clear_locked(void) {
    for (size_t i = 0; i < FILE_CACHE_BUCKETS; ++i) {
        FileCacheEntry *entry = g_cache.buckets[i];
        while (entry) {
            FileCacheEntry *next = entry->hash_next;
            free(entry);
            entry = next;
        }
        g_cache.buckets[i] = NULL;
    }
    g_cache.lru_head = g_cache.lru_tail = NULL;
    g_cache.size = 0;
}

static void cache_clear(void) {
    pthread_mutex_lock(&g_cache.lock);
    cache_clear_locked();
    pthread_mutex_unlock(&g_cache.lock);
}

static void cache_destroy(void) {
    cache_clear();
    pthread_mutex_destroy(&g_cache.lock);
}

static int cache_lookup(const char *filename,
                       FileMetadataSnapshot *out_file,
                       StorageServerSnapshot *out_ss,
                       int *out_has_ss) {
    if (!filename) return 0;
    int hit = 0;
    pthread_mutex_lock(&g_cache.lock);
    uint32_t bucket = hash_string(filename) % FILE_CACHE_BUCKETS;
    FileCacheEntry *entry = g_cache.buckets[bucket];
    while (entry) {
        if (strncmp(entry->filename, filename, FNAME_LENGTH) == 0) {
            hit = 1;
            if (out_file) {
                *out_file = entry->file_snap;
            }
            if (out_ss) {
                if (entry->has_ss) {
                    *out_ss = entry->ss_snap;
                } else {
                    memset(out_ss, 0, sizeof(*out_ss));
                }
            }
            if (out_has_ss) {
                *out_has_ss = entry->has_ss;
            }
            cache_move_to_front(entry);
            break;
        }
        entry = entry->hash_next;
    }
    pthread_mutex_unlock(&g_cache.lock);
    return hit;
}

static void cache_insert(const FileMetadataSnapshot *file_snap,
                         const StorageServerSnapshot *ss_snap,
                         int has_ss) {
    if (!file_snap) return;
    pthread_mutex_lock(&g_cache.lock);
    uint32_t bucket = hash_string(file_snap->filename) % FILE_CACHE_BUCKETS;
    FileCacheEntry *entry = g_cache.buckets[bucket];
    while (entry) {
        if (strncmp(entry->filename, file_snap->filename, FNAME_LENGTH) == 0) {
            entry->file_snap = *file_snap;
            entry->has_ss = has_ss;
            if (has_ss && ss_snap) {
                entry->ss_snap = *ss_snap;
            }
            cache_move_to_front(entry);
            pthread_mutex_unlock(&g_cache.lock);
            return;
        }
        entry = entry->hash_next;
    }
    if (g_cache.size >= FILE_CACHE_CAPACITY) {
        cache_evict_tail();
    }
    FileCacheEntry *new_entry = calloc(1, sizeof(FileCacheEntry));
    if (!new_entry) {
        pthread_mutex_unlock(&g_cache.lock);
        return;
    }
    strncpy(new_entry->filename, file_snap->filename, sizeof(new_entry->filename) - 1);
    new_entry->file_snap = *file_snap;
    new_entry->has_ss = has_ss && ss_snap;
    if (new_entry->has_ss) {
        new_entry->ss_snap = *ss_snap;
    }
    new_entry->hash_next = g_cache.buckets[bucket];
    g_cache.buckets[bucket] = new_entry;
    cache_attach_front(new_entry);
    g_cache.size++;
    pthread_mutex_unlock(&g_cache.lock);
}

static void cache_invalidate(const char *filename) {
    if (!filename) return;
    pthread_mutex_lock(&g_cache.lock);
    uint32_t bucket = hash_string(filename) % FILE_CACHE_BUCKETS;
    FileCacheEntry **cur = &g_cache.buckets[bucket];
    while (*cur) {
        if (strncmp((*cur)->filename, filename, FNAME_LENGTH) == 0) {
            FileCacheEntry *victim = *cur;
            *cur = victim->hash_next;
            cache_detach(victim);
            free(victim);
            g_cache.size--;
            break;
        }
        cur = &(*cur)->hash_next;
    }
    pthread_mutex_unlock(&g_cache.lock);
}

static void free_acl_entries(FileAccessEntry *head) {
    while (head) {
        FileAccessEntry *next = head->next;
        free(head);
        head = next;
    }
}

static int append_text_dyn(char **buf, size_t *cap, size_t *len, const char *text) {
    if (!buf || !cap || !len || !text) return -1;
    if (!*buf) {
        *cap = 128;
        *buf = malloc(*cap);
        if (!*buf) return -1;
        (*buf)[0] = '\0';
        *len = 0;
    }
    size_t need = strlen(text);
    while (*len + need + 1 > *cap) {
        size_t newcap = (*cap) * 2;
        char *nb = realloc(*buf, newcap);
        if (!nb) return -1;
        *buf = nb;
        *cap = newcap;
    }
    memcpy(*buf + *len, text, need);
    *len += need;
    (*buf)[*len] = '\0';
    return 0;
}

// uses FNV-1a hash (a non-cryptographic hash function)
static uint32_t hash_string(const char *s) {
    const uint32_t fnv_offset = 2166136261u;
    const uint32_t fnv_prime = 16777619u;
    uint32_t hash = fnv_offset;
    while (s && *s) {
        hash ^= (unsigned char)*s++;
        hash *= fnv_prime;
    }
    return hash;
}

static int normalize_username(const char *username, char *out, size_t out_len) {
    if (!username || !out || out_len == 0) return -1;
    strncpy(out, username, out_len - 1);
    out[out_len - 1] = '\0';
    size_t len = strlen(out);
    while (len > 0 && isspace((unsigned char)out[len - 1])) {
        out[--len] = '\0';
    }
    size_t start = 0;
    while (out[start] && isspace((unsigned char)out[start])) start++;
    if (start > 0) {
        memmove(out, out + start, strlen(out + start) + 1);
    }
    if (out[0] == '\0') return -1;
    return 0;
}

static StorageServerEntry *find_ss_entry_locked(const char *ss_id, uint32_t bucket) {
    StorageServerEntry *entry = g_store.ss_buckets[bucket];
    while (entry) {
        if (strncmp(entry->snap.ss_id, ss_id, METADATA_MAX_SS_ID) == 0) {
            return entry;
        }
        entry = entry->next;
    }
    return NULL;
}

static FileEntry *find_file_entry_locked(const char *filename, uint32_t bucket) {
    FileEntry *entry = g_store.file_buckets[bucket];
    while (entry) {
        if (strncmp(entry->snap.filename, filename, FNAME_LENGTH) == 0) {
            return entry;
        }
        entry = entry->next;
    }
    return NULL;
}

static FileAccessEntry *find_access_entry(FileEntry *entry, const char *username) {
    if (!entry || !username || !*username) return NULL;
    FileAccessEntry *cur = entry->acl_head;
    while (cur) {
        if (strncmp(cur->username, username, UNAME_LENGTH) == 0) {
            return cur;
        }
        cur = cur->next;
    }
    return NULL;
}

static const char *perm_to_string(uint8_t perms) {
    if ((perms & FILE_PERM_READ) && (perms & FILE_PERM_WRITE)) return "RW";
    if (perms & FILE_PERM_WRITE) return "W";
    if (perms & FILE_PERM_READ) return "R";
    return "-";
}

static char *build_acl_string_locked(FileEntry *entry) {
    if (!entry) return NULL;
    char *buffer = NULL;
    size_t cap = 0, len = 0;
    char segment[UNAME_LENGTH + 16];
    snprintf(segment, sizeof(segment), "%s (RW)", entry->snap.owner[0] ? entry->snap.owner : "owner");
    append_text_dyn(&buffer, &cap, &len, segment);
    FileAccessEntry *acl = entry->acl_head;
    while (acl) {
        if (len > 0) append_text_dyn(&buffer, &cap, &len, ", ");
        snprintf(segment, sizeof(segment), "%s (%s)", acl->username, perm_to_string(acl->perms));
        append_text_dyn(&buffer, &cap, &len, segment);
        acl = acl->next;
    }
    return buffer;
}

static UserEntry *find_user_entry_locked(const char *username, uint32_t bucket) {
    UserEntry *entry = g_store.user_buckets[bucket];
    while (entry) {
        if (strncmp(entry->snap.username, username, UNAME_LENGTH) == 0) {
            return entry;
        }
        entry = entry->next;
    }
    return NULL;
}

static void storage_entry_snapshot(StorageServerEntry *entry, StorageServerSnapshot *out) {
    if (!entry || !out) return;
    *out = entry->snap;
}

static void storage_adjust_assigned_files(const char *ss_id, int delta) {
    if (!ss_id || !*ss_id || delta == 0) return;
    pthread_rwlock_wrlock(&g_store.ss_lock);
    uint32_t bucket = hash_string(ss_id) % METADATA_SS_BUCKETS;
    StorageServerEntry *entry = find_ss_entry_locked(ss_id, bucket);
    if (entry) {
        if (delta > 0) {
            entry->snap.assigned_files += (size_t)delta;
        } else {
            size_t dec = (size_t)(-delta);
            if (entry->snap.assigned_files > dec) {
                entry->snap.assigned_files -= dec;
            } else {
                entry->snap.assigned_files = 0;
            }
        }
    }
    pthread_rwlock_unlock(&g_store.ss_lock);
}

static void file_entry_snapshot(FileEntry *entry, FileMetadataSnapshot *out) {
    if (!entry || !out) return;
    *out = entry->snap;
}

static void register_files_for_server(const char *ss_id, const char *files_csv) {
    if (!files_csv || !*files_csv) return;

    char *copy = strdup(files_csv);
    if (!copy) return;

    char *saveptr = NULL;
    char *token = strtok_r(copy, ",", &saveptr);
    while (token) {
        while (isspace((unsigned char)*token)) token++;
        char *end = token + strlen(token);
        while (end > token && isspace((unsigned char)*(end - 1))) {
            *(--end) = '\0';
        }
        if (*token) {
            metadata_link_file_to_storage(token, NULL, 0, ss_id);
        }
        token = strtok_r(NULL, ",", &saveptr);
    }

    free(copy);
}

int metadata_init(const char *persist_path) {
    memset(&g_store, 0, sizeof(g_store));
    if (pthread_rwlock_init(&g_store.ss_lock, NULL) != 0) return -1;
    if (pthread_rwlock_init(&g_store.file_lock, NULL) != 0) return -1;
    if (pthread_rwlock_init(&g_store.user_lock, NULL) != 0) return -1;
    cache_init();
    if (persist_path && *persist_path) {
        strncpy(g_store.persist_path, persist_path, sizeof(g_store.persist_path) - 1);
    }
    // TODO: load persisted metadata when format is defined.
    return 0;
}

static void free_ss_entries(void) {
    for (size_t i = 0; i < METADATA_SS_BUCKETS; ++i) {
        StorageServerEntry *entry = g_store.ss_buckets[i];
        while (entry) {
            StorageServerEntry *next = entry->next;
            free(entry);
            entry = next;
        }
        g_store.ss_buckets[i] = NULL;
    }
}

static void free_file_entries(void) {
    for (size_t i = 0; i < METADATA_FILE_BUCKETS; ++i) {
        FileEntry *entry = g_store.file_buckets[i];
        while (entry) {
            FileEntry *next = entry->next;
            free_acl_entries(entry->acl_head);
            free(entry);
            entry = next;
        }
        g_store.file_buckets[i] = NULL;
    }
}

static void free_user_entries(void) {
    for (size_t i = 0; i < METADATA_USER_BUCKETS; ++i) {
        UserEntry *entry = g_store.user_buckets[i];
        while (entry) {
            UserEntry *next = entry->next;
            free(entry);
            entry = next;
        }
        g_store.user_buckets[i] = NULL;
    }
}

void metadata_shutdown(void) {
    pthread_rwlock_wrlock(&g_store.ss_lock);
    pthread_rwlock_wrlock(&g_store.file_lock);
    pthread_rwlock_wrlock(&g_store.user_lock);
    free_ss_entries();
    free_file_entries();
    free_user_entries();
    pthread_rwlock_unlock(&g_store.user_lock);
    pthread_rwlock_unlock(&g_store.file_lock);
    pthread_rwlock_unlock(&g_store.ss_lock);
    pthread_rwlock_destroy(&g_store.ss_lock);
    pthread_rwlock_destroy(&g_store.file_lock);
    pthread_rwlock_destroy(&g_store.user_lock);
    cache_destroy();
    // TODO: persist metadata before shutdown when format is defined.
}

int metadata_register_storage_server(const char *ss_id,
                                     const char *ip,
                                     int nm_port,
                                     int client_port,
                                     const char *files_csv) {
    if (!ss_id || !*ss_id || !ip) return -1;

    uint32_t bucket = hash_string(ss_id) % METADATA_SS_BUCKETS;

    pthread_rwlock_wrlock(&g_store.ss_lock);
    StorageServerEntry *entry = find_ss_entry_locked(ss_id, bucket);
    if (!entry) {
        entry = calloc(1, sizeof(StorageServerEntry));
        if (!entry) {
            pthread_rwlock_unlock(&g_store.ss_lock);
            return -1;
        }
        entry->next = g_store.ss_buckets[bucket];
        g_store.ss_buckets[bucket] = entry;
    }

    strncpy(entry->snap.ss_id, ss_id, sizeof(entry->snap.ss_id));
    strncpy(entry->snap.ip, ip, sizeof(entry->snap.ip));
    entry->snap.nm_port = nm_port;
    entry->snap.client_port = client_port;
    entry->snap.last_seen = time(NULL);
    entry->snap.is_active = (client_port > 0) ? 1 : 0;

    pthread_rwlock_unlock(&g_store.ss_lock);

    cache_clear();

    register_files_for_server(entry->snap.ss_id, files_csv);
    return 0;
}

int metadata_mark_storage_server_down(const char *ss_id) {
    if (!ss_id || !*ss_id) return -1;
    uint32_t bucket = hash_string(ss_id) % METADATA_SS_BUCKETS;
    int found = 0;

    pthread_rwlock_wrlock(&g_store.ss_lock);
    StorageServerEntry *entry = find_ss_entry_locked(ss_id, bucket);
    if (entry) {
        entry->snap.is_active = 0;
        entry->snap.client_port = 0;
        entry->snap.last_seen = time(NULL);
        found = 1;
    }
    pthread_rwlock_unlock(&g_store.ss_lock);

    if (found) {
        cache_clear();
    }
    return found ? 0 : -1;
}

int metadata_link_file_to_storage(const char *filename,
                                  const char *owner,
                                  uint32_t acl_flags,
                                  const char *ss_id) {
    if (!filename || !*filename || !ss_id || !*ss_id) return -1;

    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    time_t now = time(NULL);
    int need_reassign = 0;
    char previous_ss_id[METADATA_MAX_SS_ID] = {0};

    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        entry = calloc(1, sizeof(FileEntry));
        if (!entry) {
            pthread_rwlock_unlock(&g_store.file_lock);
            return -1;
        }
        strncpy(entry->snap.filename, filename, sizeof(entry->snap.filename) - 1);
        entry->next = g_store.file_buckets[bucket];
        g_store.file_buckets[bucket] = entry;
    }

    if (owner && *owner) {
        if (entry->snap.owner[0] == '\0') {
            char owner_norm[UNAME_LENGTH];
            const char *owner_to_store = owner;
            if (normalize_username(owner, owner_norm, sizeof(owner_norm)) == 0) {
                owner_to_store = owner_norm;
            }
            strncpy(entry->snap.owner, owner_to_store, sizeof(entry->snap.owner) - 1);
        }
    } else if (entry->snap.owner[0] == '\0') {
        strncpy(entry->snap.owner, "system", sizeof(entry->snap.owner) - 1);
    }

    if (entry->snap.acl_flags == 0) {
        if (acl_flags) {
            entry->snap.acl_flags = acl_flags;
        } else {
            entry->snap.acl_flags = ACL_DEFAULT_FLAGS;
        }
    }

    if (strncmp(entry->snap.primary_ss_id, ss_id, METADATA_MAX_SS_ID) != 0) {
        if (entry->snap.primary_ss_id[0]) {
            strncpy(previous_ss_id, entry->snap.primary_ss_id, sizeof(previous_ss_id) - 1);
            previous_ss_id[sizeof(previous_ss_id) - 1] = '\0';
        }
        strncpy(entry->snap.primary_ss_id, ss_id, sizeof(entry->snap.primary_ss_id) - 1);
        entry->snap.primary_ss_id[sizeof(entry->snap.primary_ss_id) - 1] = '\0';
        need_reassign = 1;
    }
    if (entry->snap.ctime == 0) {
        entry->snap.ctime = now;
    }
    entry->snap.mtime = now;

    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);

    if (need_reassign) {
        if (previous_ss_id[0]) {
            storage_adjust_assigned_files(previous_ss_id, -1);
        }
        storage_adjust_assigned_files(ss_id, +1);
    }
    return 0;
}

int metadata_lookup_file(const char *filename,
                         FileMetadataSnapshot *out_file,
                         StorageServerSnapshot *out_ss) {
    if (!filename) return -1;

    FileEntry *file_entry = NULL;
    FileMetadataSnapshot local_file = {0};
    StorageServerSnapshot local_ss = {0};
    int cached_has_ss = 0;

    if (cache_lookup(filename, &local_file, &local_ss, &cached_has_ss)) {
        if (out_file) {
            *out_file = local_file;
        }
        if (out_ss) {
            if (cached_has_ss) {
                *out_ss = local_ss;
            } else {
                memset(out_ss, 0, sizeof(*out_ss));
            }
        }
        return 0;
    }

    pthread_rwlock_rdlock(&g_store.file_lock);
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    file_entry = find_file_entry_locked(filename, bucket);
    if (file_entry) {
        file_entry_snapshot(file_entry, &local_file);
    }
    pthread_rwlock_unlock(&g_store.file_lock);

    if (!file_entry) return -1;

    if (out_file) {
        *out_file = local_file;
    }

    int have_ss = 0;
    pthread_rwlock_rdlock(&g_store.ss_lock);
    uint32_t ss_bucket = hash_string(local_file.primary_ss_id) % METADATA_SS_BUCKETS;
    StorageServerEntry *ss_entry = find_ss_entry_locked(local_file.primary_ss_id, ss_bucket);
    if (ss_entry && ss_entry->snap.is_active && ss_entry->snap.client_port > 0 && ss_entry->snap.ip[0]) {
        storage_entry_snapshot(ss_entry, &local_ss);
        have_ss = 1;
    } else {
        memset(&local_ss, 0, sizeof(local_ss));
    }
    pthread_rwlock_unlock(&g_store.ss_lock);

    if (out_ss) {
        if (have_ss) {
            *out_ss = local_ss;
        } else {
            memset(out_ss, 0, sizeof(*out_ss));
        }
    }

    cache_insert(&local_file, &local_ss, have_ss);

    return 0;
}

int metadata_list_files(FileMetadataSnapshot **out_files,
                        size_t *out_count) {
    if (!out_files || !out_count) return -1;
    *out_files = NULL;
    *out_count = 0;

    pthread_rwlock_rdlock(&g_store.file_lock);

    size_t count = 0;
    for (size_t i = 0; i < METADATA_FILE_BUCKETS; ++i) {
        FileEntry *entry = g_store.file_buckets[i];
        while (entry) {
            count++;
            entry = entry->next;
        }
    }

    if (count == 0) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return 0;
    }

    FileMetadataSnapshot *arr = calloc(count, sizeof(FileMetadataSnapshot));
    if (!arr) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return -1;
    }

    size_t idx = 0;
    for (size_t i = 0; i < METADATA_FILE_BUCKETS; ++i) {
        FileEntry *entry = g_store.file_buckets[i];
        while (entry) {
            arr[idx++] = entry->snap;
            entry = entry->next;
        }
    }

    pthread_rwlock_unlock(&g_store.file_lock);

    *out_files = arr;
    *out_count = count;
    return 0;
}

void metadata_free_file_list(FileMetadataSnapshot *files) {
    free(files);
}

int metadata_grant_access(const char *filename,
                          const char *acting_user,
                          const char *target_user,
                          int grant_write) {
    if (!filename || !*filename || !acting_user || !*acting_user || !target_user || !*target_user) {
        return ERR_INVALID_ARG;
    }

    char owner_norm[UNAME_LENGTH];
    char target_norm[UNAME_LENGTH];
    if (normalize_username(acting_user, owner_norm, sizeof(owner_norm)) != 0) {
        return ERR_INVALID_ARG;
    }
    if (normalize_username(target_user, target_norm, sizeof(target_norm)) != 0) {
        return ERR_INVALID_ARG;
    }
    if (strncmp(owner_norm, target_norm, UNAME_LENGTH) == 0) {
        return ALL_OK; // owner always has full access
    }
    if (!metadata_user_exists(target_norm)) {
        return ERR_USER_NOT_FOUND;
    }

    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    char entry_owner[UNAME_LENGTH];
    if (normalize_username(entry->snap.owner, entry_owner, sizeof(entry_owner)) != 0) {
        strncpy(entry_owner, entry->snap.owner, sizeof(entry_owner) - 1);
        entry_owner[sizeof(entry_owner) - 1] = '\0';
    }
    if (strncmp(entry_owner, owner_norm, UNAME_LENGTH) != 0) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_NOT_OWNER;
    }
    FileAccessEntry *acl = find_access_entry(entry, target_norm);
    if (!acl) {
        acl = calloc(1, sizeof(FileAccessEntry));
        if (!acl) {
            pthread_rwlock_unlock(&g_store.file_lock);
            return ERR_SYSTEM_FAILURE;
        }
        strncpy(acl->username, target_norm, sizeof(acl->username) - 1);
        acl->perms = 0;
        acl->next = entry->acl_head;
        entry->acl_head = acl;
    }
    acl->perms |= FILE_PERM_READ;
    if (grant_write) {
        acl->perms |= FILE_PERM_WRITE;
    }
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    return ALL_OK;
}

int metadata_remove_access(const char *filename,
                           const char *acting_user,
                           const char *target_user) {
    if (!filename || !*filename || !acting_user || !*acting_user || !target_user || !*target_user) {
        return ERR_INVALID_ARG;
    }
    char owner_norm[UNAME_LENGTH];
    char target_norm[UNAME_LENGTH];
    if (normalize_username(acting_user, owner_norm, sizeof(owner_norm)) != 0) {
        return ERR_INVALID_ARG;
    }
    if (normalize_username(target_user, target_norm, sizeof(target_norm)) != 0) {
        return ERR_INVALID_ARG;
    }
    if (strncmp(owner_norm, target_norm, UNAME_LENGTH) == 0) {
        return ERR_INVALID_ARG;
    }
    if (!metadata_user_exists(target_norm)) {
        return ERR_USER_NOT_FOUND;
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    char entry_owner[UNAME_LENGTH];
    if (normalize_username(entry->snap.owner, entry_owner, sizeof(entry_owner)) != 0) {
        strncpy(entry_owner, entry->snap.owner, sizeof(entry_owner) - 1);
        entry_owner[sizeof(entry_owner) - 1] = '\0';
    }
    if (strncmp(entry_owner, owner_norm, UNAME_LENGTH) != 0) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_NOT_OWNER;
    }
    FileAccessEntry **prev = &entry->acl_head;
    while (*prev && strncmp((*prev)->username, target_norm, UNAME_LENGTH) != 0) {
        prev = &(*prev)->next;
    }
    if (!*prev) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ALL_OK;
    }
    FileAccessEntry *victim = *prev;
    *prev = victim->next;
    free(victim);
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    return ALL_OK;
}

int metadata_user_has_access(const char *filename,
                             const char *username,
                             int require_write) {
    if (!filename || !*filename || !username || !*username) {
        return 0;
    }
    char uname[UNAME_LENGTH];
    if (normalize_username(username, uname, sizeof(uname)) != 0) {
        return 0;
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    int allowed = 0;
    pthread_rwlock_rdlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return -1;
    }
    char entry_owner[UNAME_LENGTH];
    if (normalize_username(entry->snap.owner, entry_owner, sizeof(entry_owner)) != 0) {
        strncpy(entry_owner, entry->snap.owner, sizeof(entry_owner) - 1);
        entry_owner[sizeof(entry_owner) - 1] = '\0';
    }
    if (strncmp(entry_owner, uname, UNAME_LENGTH) == 0) {
        allowed = 1;
    } else if (!require_write && (entry->snap.acl_flags & ACL_FLAG_WORLD_READ)) {
        allowed = 1;
    } else if (require_write && (entry->snap.acl_flags & ACL_FLAG_WORLD_WRITE)) {
        allowed = 1;
    } else {
        FileAccessEntry *acl = find_access_entry(entry, uname);
        if (acl) {
            if (!require_write && (acl->perms & FILE_PERM_READ)) allowed = 1;
            if (require_write && (acl->perms & FILE_PERM_WRITE)) allowed = 1;
        }
    }
    pthread_rwlock_unlock(&g_store.file_lock);
    return allowed;
}

int metadata_get_file_details(const char *filename,
                              FileMetadataSnapshot *out_file,
                              char **out_acl_desc) {
    if (!filename || !*filename) {
        return ERR_INVALID_ARG;
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    char *acl_str = NULL;
    FileMetadataSnapshot snap = {0};
    int rc = 0;
    pthread_rwlock_rdlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        rc = ERR_FILE_NOT_FOUND;
    } else {
        snap = entry->snap;
        if (out_acl_desc) {
            acl_str = build_acl_string_locked(entry);
        }
    }
    pthread_rwlock_unlock(&g_store.file_lock);
    if (rc != 0) {
        if (acl_str) free(acl_str);
        return rc;
    }
    if (out_file) {
        *out_file = snap;
    }
    if (out_acl_desc) {
        if (!acl_str) {
            acl_str = strdup("(no ACL data)");
        }
        *out_acl_desc = acl_str;
    }
    return 0;
}

int metadata_record_access(const char *filename,
                           const char *username,
                           int is_write) {
    if (!filename || !*filename) {
        return ERR_INVALID_ARG;
    }
    char uname_buf[UNAME_LENGTH];
    const char *uname = "system";
    if (username && *username) {
        if (normalize_username(username, uname_buf, sizeof(uname_buf)) == 0) {
            uname = uname_buf;
        } else {
            uname = username;
        }
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    time_t now = time(NULL);
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    entry->snap.last_access = now;
    strncpy(entry->snap.last_access_user, uname, sizeof(entry->snap.last_access_user) - 1);
    entry->snap.last_access_user[sizeof(entry->snap.last_access_user) - 1] = '\0';
    if (is_write) {
        entry->snap.mtime = now;
    }
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    return 0;
}

int metadata_delete_file(const char *filename) {
    if (!filename || !*filename) {
        return ERR_INVALID_ARG;
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    char ss_id[METADATA_MAX_SS_ID] = {0};
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry **prev = &g_store.file_buckets[bucket];
    while (*prev && strncmp((*prev)->snap.filename, filename, FNAME_LENGTH) != 0) {
        prev = &(*prev)->next;
    }
    if (!*prev) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    if ((*prev)->snap.active_writers > 0) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_SENT_LOCKED;
    }
    FileEntry *victim = *prev;
    *prev = victim->next;
    if (victim->snap.primary_ss_id[0]) {
        strncpy(ss_id, victim->snap.primary_ss_id, sizeof(ss_id) - 1);
        ss_id[sizeof(ss_id) - 1] = '\0';
    }
    free_acl_entries(victim->acl_head);
    free(victim);
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    if (ss_id[0]) {
        storage_adjust_assigned_files(ss_id, -1);
    }
    return 0;
}

int metadata_pick_storage_server(StorageServerSnapshot *out_ss) {
    if (!out_ss) return -1;
    pthread_rwlock_rdlock(&g_store.ss_lock);
    StorageServerEntry *best = NULL;
    for (size_t i = 0; i < METADATA_SS_BUCKETS; ++i) {
        StorageServerEntry *entry = g_store.ss_buckets[i];
        while (entry) {
            if (!entry->snap.is_active || entry->snap.client_port <= 0 || entry->snap.ip[0] == '\0') {
                entry = entry->next;
                continue;
            }
            if (!best ||
                entry->snap.assigned_files < best->snap.assigned_files ||
                (entry->snap.assigned_files == best->snap.assigned_files &&
                 strncmp(entry->snap.ss_id, best->snap.ss_id, METADATA_MAX_SS_ID) < 0)) {
                best = entry;
            }
            entry = entry->next;
        }
    }
    if (best) {
        storage_entry_snapshot(best, out_ss);
        pthread_rwlock_unlock(&g_store.ss_lock);
        return 0;
    }
    pthread_rwlock_unlock(&g_store.ss_lock);
    return METADATA_ERR_NO_SS;
}

int metadata_create_file_record(const char *filename,
                                const char *owner,
                                uint32_t acl_flags,
                                const char *ss_id,
                                size_t word_count,
                                size_t char_count,
                                time_t last_access_ts) {
    if (!filename || !*filename || !owner || !*owner || !ss_id || !*ss_id) {
        return -1;
    }

    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    time_t now = last_access_ts ? last_access_ts : time(NULL);

    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *existing = find_file_entry_locked(filename, bucket);
    if (existing) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return METADATA_ERR_EXISTS;
    }

    FileEntry *entry = calloc(1, sizeof(FileEntry));
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return -1;
    }

    strncpy(entry->snap.filename, filename, sizeof(entry->snap.filename) - 1);
    char owner_norm[UNAME_LENGTH];
    const char *owner_to_store = owner;
    if (normalize_username(owner, owner_norm, sizeof(owner_norm)) == 0) {
        owner_to_store = owner_norm;
    }
    strncpy(entry->snap.owner, owner_to_store, sizeof(entry->snap.owner) - 1);
    entry->snap.acl_flags = acl_flags ? acl_flags : ACL_DEFAULT_FLAGS;
    strncpy(entry->snap.primary_ss_id, ss_id, sizeof(entry->snap.primary_ss_id) - 1);
    entry->snap.ctime = now;
    entry->snap.mtime = now;
    entry->snap.last_access = now;
    strncpy(entry->snap.last_access_user, owner_to_store, sizeof(entry->snap.last_access_user) - 1);
    entry->snap.word_count = word_count;
    entry->snap.char_count = char_count;
    entry->snap.active_writers = 0;
    entry->snap.user_visible = 1;

    entry->next = g_store.file_buckets[bucket];
    g_store.file_buckets[bucket] = entry;
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    storage_adjust_assigned_files(ss_id, +1);
    return 0;
}

int metadata_begin_write_session(const char *filename,
                                 const char *username) {
    if (!filename || !*filename) {
        return ERR_INVALID_ARG;
    }
    (void)username;
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    entry->snap.active_writers++;
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    return 0;
}

int metadata_finish_write_session(const char *filename,
                                  const char *username,
                                  size_t word_count,
                                  size_t char_count,
                                  int success) {
    if (!filename || !*filename) {
        return ERR_INVALID_ARG;
    }
    char uname_buf[UNAME_LENGTH];
    const char *uname = "system";
    if (username && *username) {
        if (normalize_username(username, uname_buf, sizeof(uname_buf)) == 0) {
            uname = uname_buf;
        } else {
            uname = username;
        }
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    time_t now = time(NULL);
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    if (entry->snap.active_writers > 0) {
        entry->snap.active_writers--;
    } else {
        entry->snap.active_writers = 0;
    }
    if (success) {
        FileMetadataSnapshot prior = entry->snap;
        prior.active_writers = 0;
        entry->undo_snap = prior;
        entry->undo_valid = 1;
        entry->snap.last_access = now;
        strncpy(entry->snap.last_access_user, uname, sizeof(entry->snap.last_access_user) - 1);
        entry->snap.last_access_user[sizeof(entry->snap.last_access_user) - 1] = '\0';
        entry->snap.word_count = word_count;
        entry->snap.char_count = char_count;
        entry->snap.mtime = now;
    }
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    return 0;
}

int metadata_can_undo(const char *filename) {
    if (!filename || !*filename) {
        return 0;
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    pthread_rwlock_rdlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    int available = (entry && entry->undo_valid);
    pthread_rwlock_unlock(&g_store.file_lock);
    return available;
}

int metadata_apply_undo(const char *filename) {
    if (!filename || !*filename) {
        return ERR_INVALID_ARG;
    }
    uint32_t bucket = hash_string(filename) % METADATA_FILE_BUCKETS;
    pthread_rwlock_wrlock(&g_store.file_lock);
    FileEntry *entry = find_file_entry_locked(filename, bucket);
    if (!entry) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_FILE_NOT_FOUND;
    }
    if (!entry->undo_valid) {
        pthread_rwlock_unlock(&g_store.file_lock);
        return ERR_NOTHING_TO_UNDO;
    }
    entry->snap = entry->undo_snap;
    entry->snap.active_writers = 0;
    entry->undo_valid = 0;
    memset(&entry->undo_snap, 0, sizeof(entry->undo_snap));
    pthread_rwlock_unlock(&g_store.file_lock);
    cache_invalidate(filename);
    return 0;
}

int metadata_register_user(const char *username) {
    if (!username || !*username) {
        return -1;
    }

    char uname[UNAME_LENGTH];
    if (normalize_username(username, uname, sizeof(uname)) != 0) {
        return -1;
    }

    uint32_t bucket = hash_string(uname) % METADATA_USER_BUCKETS;
    time_t now = time(NULL);

    pthread_rwlock_wrlock(&g_store.user_lock);
    UserEntry *entry = find_user_entry_locked(uname, bucket);
    if (!entry) {
        entry = calloc(1, sizeof(UserEntry));
        if (!entry) {
            pthread_rwlock_unlock(&g_store.user_lock);
            return -1;
        }
        strncpy(entry->snap.username, uname, sizeof(entry->snap.username) - 1);
        entry->next = g_store.user_buckets[bucket];
        g_store.user_buckets[bucket] = entry;
    }
    entry->snap.last_seen = now;
    pthread_rwlock_unlock(&g_store.user_lock);
    return 0;
}

int metadata_user_exists(const char *username) {
    char uname[UNAME_LENGTH];
    if (normalize_username(username, uname, sizeof(uname)) != 0) {
        return 0;
    }
    uint32_t bucket = hash_string(uname) % METADATA_USER_BUCKETS;
    int exists = 0;
    pthread_rwlock_rdlock(&g_store.user_lock);
    UserEntry *entry = find_user_entry_locked(uname, bucket);
    if (entry) exists = 1;
    pthread_rwlock_unlock(&g_store.user_lock);
    return exists;
}

static int user_snapshot_cmp(const void *a, const void *b) {
    const UserSnapshot *ua = (const UserSnapshot *)a;
    const UserSnapshot *ub = (const UserSnapshot *)b;
    return strncmp(ua->username, ub->username, UNAME_LENGTH);
}

int metadata_list_users(UserSnapshot **out_users,
                        size_t *out_count) {
    if (!out_users || !out_count) return -1;
    *out_users = NULL;
    *out_count = 0;

    pthread_rwlock_rdlock(&g_store.user_lock);

    size_t count = 0;
    for (size_t i = 0; i < METADATA_USER_BUCKETS; ++i) {
        UserEntry *entry = g_store.user_buckets[i];
        while (entry) {
            count++;
            entry = entry->next;
        }
    }

    if (count == 0) {
        pthread_rwlock_unlock(&g_store.user_lock);
        return 0;
    }

    UserSnapshot *arr = calloc(count, sizeof(UserSnapshot));
    if (!arr) {
        pthread_rwlock_unlock(&g_store.user_lock);
        return -1;
    }

    size_t idx = 0;
    for (size_t i = 0; i < METADATA_USER_BUCKETS; ++i) {
        UserEntry *entry = g_store.user_buckets[i];
        while (entry) {
            arr[idx++] = entry->snap;
            entry = entry->next;
        }
    }

    pthread_rwlock_unlock(&g_store.user_lock);

    qsort(arr, count, sizeof(UserSnapshot), user_snapshot_cmp);

    *out_users = arr;
    *out_count = count;
    return 0;
}

void metadata_free_user_list(UserSnapshot *users) {
    free(users);
}
