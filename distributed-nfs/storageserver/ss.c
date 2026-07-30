#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <dirent.h>
#include <sys/stat.h>
#include <sys/file.h>
#include <ctype.h>
#include <time.h>

#include "../shared/nwutils.h"
#include "../shared/logging.h"
#include "../shared/error.h"
#include "../shared/parser.h"

#define DEFAULT_STORAGE_PARENT "./storageserver"
#define SS_REGISTRY_FILE "./storageserver/.ss_registry"

static char g_storage_dir[PATH_MAX] = ".";
static char g_ss_root_dir[PATH_MAX] = ".";
static char g_ss_id[SS_ID_LENGTH] = "";

static char *load_file_contents(const char *filename);
static int write_file_contents(const char *filename, const char *content);
static int file_has_active_writers(const char *filename);

static void trim_string(char *s) {
	if (!s) return;
	size_t len = strlen(s);
	while (len > 0 && isspace((unsigned char)s[len - 1])) {
		s[--len] = '\0';
	}
	size_t start = 0;
	while (s[start] && isspace((unsigned char)s[start])) start++;
	if (start > 0) memmove(s, s + start, strlen(s + start) + 1);
}

static int ensure_directory_recursive(const char *path) {
	if (!path || !*path) {
		errno = EINVAL;
		return -1;
	}
	char tmp[PATH_MAX];
	strncpy(tmp, path, sizeof(tmp) - 1);
	tmp[sizeof(tmp) - 1] = '\0';
	size_t len = strlen(tmp);
	if (len == 0) return 0;
	for (char *p = tmp + 1; *p; ++p) {
		if (*p == '/') {
			char old = *p;
			*p = '\0';
			if (tmp[0] && mkdir(tmp, 0755) != 0 && errno != EEXIST) {
				*p = old;
				return -1;
			}
			*p = old;
		}
	}
	if (mkdir(tmp, 0755) != 0 && errno != EEXIST) {
		return -1;
	}
	return 0;
}

static const char *path_basename(const char *path) {
	if (!path) return NULL;
	const char *slash = strrchr(path, '/');
	return slash ? slash + 1 : path;
}

typedef struct RegistryEntry {
	int client_port;
	char root[PATH_MAX];
} RegistryEntry;

static int parse_server_index(const char *name) {
	if (!name || strncmp(name, "server", 6) != 0) return -1;
	if (!isdigit((unsigned char)name[6])) return -1;
	char *endptr = NULL;
	long value = strtol(name + 6, &endptr, 10);
	if (!endptr || *endptr != '\0' || value <= 0 || value > INT_MAX) return -1;
	return (int)value;
}

static int pick_next_instance_root(char *out_path, size_t out_len) {
	if (!out_path || out_len == 0) {
		errno = EINVAL;
		return -1;
	}
	if (ensure_directory_recursive(DEFAULT_STORAGE_PARENT) != 0) {
		return -1;
	}
	DIR *dir = opendir(DEFAULT_STORAGE_PARENT);
	if (!dir) {
		return -1;
	}
	int max_index = 0;
	struct dirent *entry;
	while ((entry = readdir(dir))) {
		if (entry->d_name[0] == '.') continue;
		int idx = parse_server_index(entry->d_name);
		if (idx <= 0) continue;
		char candidate[PATH_MAX];
		int written = snprintf(candidate, sizeof(candidate), "%s/%s", DEFAULT_STORAGE_PARENT, entry->d_name);
		if (written < 0 || written >= (int)sizeof(candidate)) continue;
		struct stat st;
		if (stat(candidate, &st) != 0 || !S_ISDIR(st.st_mode)) continue;
		if (idx > max_index) max_index = idx;
	}
	closedir(dir);
	int next_idx = max_index + 1;
	int needed = snprintf(out_path, out_len, "%s/server%d", DEFAULT_STORAGE_PARENT, next_idx);
	if (needed < 0 || needed >= (int)out_len) {
		errno = ENAMETOOLONG;
		return -1;
	}
	return 0;
}

static int registry_assign_root(int client_port, const char *requested_root, char *resolved_root, size_t resolved_len) {
	if (!resolved_root || resolved_len == 0) {
		errno = EINVAL;
		return -1;
	}
	if (ensure_directory_recursive(DEFAULT_STORAGE_PARENT) != 0) {
		return -1;
	}
	int fd = open(SS_REGISTRY_FILE, O_RDWR | O_CREAT, 0644);
	if (fd < 0) {
		return -1;
	}
	if (flock(fd, LOCK_EX) != 0) {
		close(fd);
		return -1;
	}
	FILE *fp = fdopen(fd, "r+");
	if (!fp) {
		flock(fd, LOCK_UN);
		close(fd);
		return -1;
	}
	RegistryEntry *entries = NULL;
	size_t count = 0;
	size_t capacity = 0;
	char line[PATH_MAX + 64];
	rewind(fp);
	while (fgets(line, sizeof(line), fp)) {
		int port = 0;
		char path[PATH_MAX];
		if (sscanf(line, "%d %s", &port, path) != 2) continue;
		if (count == capacity) {
			size_t newcap = capacity ? capacity * 2 : 8;
			RegistryEntry *tmp = realloc(entries, newcap * sizeof(*tmp));
			if (!tmp) {
				free(entries);
				fclose(fp);
				return -1;
			}
			entries = tmp;
			capacity = newcap;
		}
		entries[count].client_port = port;
		strncpy(entries[count].root, path, sizeof(entries[count].root) - 1);
		entries[count].root[sizeof(entries[count].root) - 1] = '\0';
		count++;
	}
	int existing_idx = -1;
	for (size_t i = 0; i < count; ++i) {
		if (entries[i].client_port == client_port) {
			existing_idx = (int)i;
			break;
		}
	}
	if (requested_root && *requested_root) {
		strncpy(resolved_root, requested_root, resolved_len - 1);
		resolved_root[resolved_len - 1] = '\0';
	} else if (existing_idx >= 0) {
		strncpy(resolved_root, entries[existing_idx].root, resolved_len - 1);
		resolved_root[resolved_len - 1] = '\0';
	} else {
		if (pick_next_instance_root(resolved_root, resolved_len) != 0) {
			free(entries);
			fclose(fp);
			return -1;
		}
	}
	for (size_t i = 0; i < count; ++i) {
		if ((int)i == existing_idx) continue;
		if (strcmp(entries[i].root, resolved_root) == 0) {
			errno = EEXIST;
			free(entries);
			fclose(fp);
			return -1;
		}
	}
	if (existing_idx >= 0) {
		strncpy(entries[existing_idx].root, resolved_root, sizeof(entries[existing_idx].root) - 1);
		entries[existing_idx].root[sizeof(entries[existing_idx].root) - 1] = '\0';
	} else {
		if (count == capacity) {
			size_t newcap = capacity ? capacity * 2 : 8;
			RegistryEntry *tmp = realloc(entries, newcap * sizeof(*tmp));
			if (!tmp) {
				free(entries);
				fclose(fp);
				return -1;
			}
			entries = tmp;
			capacity = newcap;
		}
		entries[count].client_port = client_port;
		strncpy(entries[count].root, resolved_root, sizeof(entries[count].root) - 1);
		entries[count].root[sizeof(entries[count].root) - 1] = '\0';
		count++;
	}
	rewind(fp);
	if (ftruncate(fd, 0) != 0) {
		free(entries);
		fclose(fp);
		return -1;
	}
	for (size_t i = 0; i < count; ++i) {
		fprintf(fp, "%d %s\n", entries[i].client_port, entries[i].root);
	}
	fflush(fp);
	free(entries);
	fclose(fp);
	return 0;
}

static void slugify_token(char *s) {
	if (!s) return;
	for (char *p = s; *p; ++p) {
		if (!isalnum((unsigned char)*p) && *p != '-' && *p != '_') {
			*p = '-';
		}
	}
}

static int load_or_create_ss_id(const char *root_dir, int client_port) {
	char id_path[PATH_MAX];
	int written = snprintf(id_path, sizeof(id_path), "%s/server.id", root_dir);
	if (written < 0 || written >= (int)sizeof(id_path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	FILE *fp = fopen(id_path, "r");
	if (fp) {
		char buf[SS_ID_LENGTH * 2];
		if (fgets(buf, sizeof(buf), fp)) {
			trim_string(buf);
			if (buf[0]) {
				if (g_ss_id[0] && strncmp(g_ss_id, buf, sizeof(g_ss_id) - 1) != 0) {
					fclose(fp);
					errno = EEXIST;
					return -1;
				}
				strncpy(g_ss_id, buf, sizeof(g_ss_id) - 1);
				g_ss_id[sizeof(g_ss_id) - 1] = '\0';
				fclose(fp);
				return 0;
			}
		}
		fclose(fp);
	}
	if (!g_ss_id[0]) {
		const char *env_id = getenv("SS_ID");
		if (env_id && *env_id) {
			strncpy(g_ss_id, env_id, sizeof(g_ss_id) - 1);
			g_ss_id[sizeof(g_ss_id) - 1] = '\0';
		} else {
			char hostname[16];
			if (gethostname(hostname, sizeof(hostname)) != 0 || hostname[0] == '\0') {
				strncpy(hostname, "host", sizeof(hostname) - 1);
				hostname[sizeof(hostname) - 1] = '\0';
			}
			slugify_token(hostname);
			const char *root_name = path_basename(root_dir);
			char root_slug[16] = {0};
			if (root_name && *root_name) {
				strncpy(root_slug, root_name, sizeof(root_slug) - 1);
			} else {
				strncpy(root_slug, "server", sizeof(root_slug) - 1);
			}
			root_slug[sizeof(root_slug) - 1] = '\0';
			slugify_token(root_slug);
			unsigned int randbits = (unsigned int)rand();
			snprintf(g_ss_id, sizeof(g_ss_id), "%s-%s-%d-%u",
			        root_slug, hostname, client_port, randbits);
		}
	}
	FILE *out = fopen(id_path, "w");
	if (!out) {
		return -1;
	}
	fprintf(out, "%s\n", g_ss_id);
	fclose(out);
	return 0;
}

static int configure_storage_paths(const char *arg_root, int client_port) {
	if (registry_assign_root(client_port, arg_root, g_ss_root_dir, sizeof(g_ss_root_dir)) != 0) {
		return -1;
	}
	if (ensure_directory_recursive(g_ss_root_dir) != 0) {
		return -1;
	}
	if (load_or_create_ss_id(g_ss_root_dir, client_port) != 0) {
		return -1;
	}
	int written = snprintf(g_storage_dir, sizeof(g_storage_dir), "%s/files", g_ss_root_dir);
	if (written < 0 || written >= (int)sizeof(g_storage_dir)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	if (ensure_directory_recursive(g_storage_dir) != 0) {
		return -1;
	}
	return 0;
}

static int build_undo_path(const char *filename, char *out, size_t out_len) {
	if (!filename || !*filename || !out || out_len == 0) {
		errno = EINVAL;
		return -1;
	}
	int written = snprintf(out, out_len, "%s/.undo/%s.undo", g_storage_dir, filename);
	if (written < 0 || written >= (int)out_len) {
		errno = ENAMETOOLONG;
		return -1;
	}
	return 0;
}

static int ensure_undo_dir(void) {
	char dir_path[PATH_MAX];
	int written = snprintf(dir_path, sizeof(dir_path), "%s/.undo", g_storage_dir);
	if (written < 0 || written >= (int)sizeof(dir_path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	return ensure_directory_recursive(dir_path);
}

static int store_undo_snapshot(const char *filename, const char *content) {
	if (ensure_undo_dir() != 0) return -1;
	char path[PATH_MAX];
	if (build_undo_path(filename, path, sizeof(path)) != 0) return -1;
	FILE *fp = fopen(path, "w");
	if (!fp) return -1;
	const char *src = content ? content : "";
	size_t len = strlen(src);
	if (len > 0 && fwrite(src, 1, len, fp) != len) {
		int saved = errno;
		fclose(fp);
		errno = saved;
		return -1;
	}
	fflush(fp);
	fclose(fp);
	return 0;
}

static char *load_undo_snapshot(const char *filename) {
	char path[PATH_MAX];
	if (build_undo_path(filename, path, sizeof(path)) != 0) return NULL;
	FILE *fp = fopen(path, "r");
	if (!fp) return NULL;
	if (fseek(fp, 0, SEEK_END) != 0) {
		fclose(fp);
		return NULL;
	}
	long size = ftell(fp);
	if (size < 0) {
		fclose(fp);
		return NULL;
	}
	rewind(fp);
	size_t buf_size = (size_t)size;
	char *buf = calloc(buf_size + 1, 1);
	if (!buf) {
		fclose(fp);
		return NULL;
	}
	if (buf_size > 0) {
		if (fread(buf, 1, buf_size, fp) != buf_size) {
			free(buf);
			fclose(fp);
			return NULL;
		}
	}
	buf[buf_size] = '\0';
	fclose(fp);
	return buf;
}

static int clear_undo_snapshot(const char *filename) {
	char path[PATH_MAX];
	if (build_undo_path(filename, path, sizeof(path)) != 0) return -1;
	if (unlink(path) == 0) return 0;
	if (errno == ENOENT) return 0;
	return -1;
}

typedef struct SentenceLockEntry {
	SentenceNode *sentence;
	int append_lock;
	struct SentenceLockEntry *next;
} SentenceLockEntry;

typedef struct DocumentState {
	char filename[FNAME_LENGTH];
	ParsedFile *pf;
	SentenceLockEntry *locks;
	int active_writers;
	pthread_mutex_t mutex;
	struct DocumentState *next;
} DocumentState;

static DocumentState *g_documents = NULL;
static pthread_mutex_t g_documents_lock = PTHREAD_MUTEX_INITIALIZER;

static void destroy_sentence(SentenceNode *sent);

static DocumentState *find_document_state(const char *filename) {
	DocumentState *result = NULL;
	pthread_mutex_lock(&g_documents_lock);
	DocumentState *cur = g_documents;
	while (cur) {
		if (strncmp(cur->filename, filename, FNAME_LENGTH) == 0) {
			result = cur;
			break;
		}
		cur = cur->next;
	}
	pthread_mutex_unlock(&g_documents_lock);
	return result;
}

static DocumentState *get_document_state(const char *filename) {
	DocumentState *doc = find_document_state(filename);
	if (doc) return doc;
	doc = calloc(1, sizeof(DocumentState));
	if (!doc) return NULL;
	strncpy(doc->filename, filename, sizeof(doc->filename) - 1);
	pthread_mutex_init(&doc->mutex, NULL);
	pthread_mutex_lock(&g_documents_lock);
	doc->next = g_documents;
	g_documents = doc;
	pthread_mutex_unlock(&g_documents_lock);
	return doc;
}

static int document_reload_from_text(DocumentState *doc, const char *text) {
	if (!doc || !text) return -1;
	ParsedFile *parsed = parse_file_content(text);
	if (!parsed) return -1;
	if (doc->pf) free_parsed_file(doc->pf);
	doc->pf = parsed;
	return 0;
}

static int file_has_active_writers(const char *filename) {
	DocumentState *doc = find_document_state(filename);
	if (!doc) return 0;
	int active = 0;
	pthread_mutex_lock(&doc->mutex);
	active = doc->active_writers;
	pthread_mutex_unlock(&doc->mutex);
	return active;
}

static int document_lock_sentence(DocumentState *doc,
		const char *filename,
		size_t sentence_idx,
		SentenceNode **out_sentence,
		int *out_append,
		char **out_snapshot) {
	if (!doc || !out_sentence || !out_append || !out_snapshot) return ERR_SYSTEM_FAILURE;
	*out_sentence = NULL;
	*out_append = 0;
	*out_snapshot = NULL;
	pthread_mutex_lock(&doc->mutex);
	if (!doc->pf) {
		char *content = load_file_contents(filename);
		if (!content) {
			pthread_mutex_unlock(&doc->mutex);
			return (errno == ENOENT) ? ERR_FILE_NOT_FOUND : ERR_SYSTEM_FAILURE;
		}
		ParsedFile *parsed = parse_file_content(content);
		if (!parsed) {
			free(content);
			pthread_mutex_unlock(&doc->mutex);
			return ERR_SYSTEM_FAILURE;
		}
		doc->pf = parsed;
		*out_snapshot = content;
	} else {
		char *serialized = serialize_parsed_file(doc->pf);
		if (!serialized) {
			pthread_mutex_unlock(&doc->mutex);
			return ERR_SYSTEM_FAILURE;
		}
		*out_snapshot = serialized;
	}
	size_t sentence_count = doc->pf ? doc->pf->sentence_count : 0;
	SentenceNode *target = NULL;
	int append_mode = 0;
	if (sentence_idx < sentence_count) {
		target = parser_get_sentence(doc->pf, sentence_idx);
		SentenceLockEntry *cur = doc->locks;
		while (cur) {
			if (!cur->append_lock && cur->sentence == target) {
				pthread_mutex_unlock(&doc->mutex);
				free(*out_snapshot);
				*out_snapshot = NULL;
				return ERR_SENT_LOCKED;
			}
			cur = cur->next;
		}
	} else if (sentence_idx == sentence_count) {
		append_mode = 1;
		SentenceNode *last = doc->pf ? doc->pf->tail : NULL;
		if (last && last->delimiter == '\0') {
			pthread_mutex_unlock(&doc->mutex);
			free(*out_snapshot);
			*out_snapshot = NULL;
			return ERR_SENT_INDEX;
		}
		SentenceLockEntry *cur = doc->locks;
		while (cur) {
			if (cur->append_lock) {
				pthread_mutex_unlock(&doc->mutex);
				free(*out_snapshot);
				*out_snapshot = NULL;
				return ERR_SENT_LOCKED;
			}
			cur = cur->next;
		}
	} else {
		pthread_mutex_unlock(&doc->mutex);
		free(*out_snapshot);
		*out_snapshot = NULL;
		return ERR_SENT_INDEX;
	}
	SentenceLockEntry *entry = calloc(1, sizeof(SentenceLockEntry));
	if (!entry) {
		pthread_mutex_unlock(&doc->mutex);
		free(*out_snapshot);
		*out_snapshot = NULL;
		return ERR_SYSTEM_FAILURE;
	}
	entry->sentence = target;
	entry->append_lock = append_mode;
	entry->next = doc->locks;
	doc->locks = entry;
	doc->active_writers++;
	*out_sentence = target;
	*out_append = append_mode;
	pthread_mutex_unlock(&doc->mutex);
	return ALL_OK;
}

static void document_unlock_sentence(DocumentState *doc, SentenceNode *sentence, int append_mode) {
	if (!doc) return;
	pthread_mutex_lock(&doc->mutex);
	SentenceLockEntry **cur = &doc->locks;
	while (*cur) {
		if ((*cur)->sentence == sentence && (*cur)->append_lock == append_mode) {
			SentenceLockEntry *victim = *cur;
			*cur = victim->next;
			free(victim);
			if (doc->active_writers > 0) doc->active_writers--;
			break;
		}
		cur = &(*cur)->next;
	}
	pthread_mutex_unlock(&doc->mutex);
}

static int document_apply_sentence_update(DocumentState *doc,
		SentenceNode *target,
		int append_mode,
		ParsedFile *replacement) {
	if (!doc || !replacement || !doc->pf) return -1;
	SentenceNode *ins_head = replacement->head;
	SentenceNode *ins_tail = replacement->tail;
	size_t ins_count = replacement->sentence_count;
	if (!ins_head || !ins_tail || ins_count == 0) return -1;
	// Detach nodes from replacement container so they won't be freed later.
	replacement->head = replacement->tail = NULL;
	replacement->sentence_count = 0;
	if (append_mode) {
		SentenceNode *before = doc->pf->tail;
		if (before) {
			before->next = ins_head;
			ins_head->prev = before;
		} else {
			doc->pf->head = ins_head;
		}
		ins_tail->next = NULL;
		doc->pf->tail = ins_tail;
		doc->pf->sentence_count += ins_count;
		return 0;
	}
	if (!target) return -1;
	SentenceNode *before = target->prev;
	SentenceNode *after = target->next;
	if (before) before->next = ins_head;
	else doc->pf->head = ins_head;
	ins_head->prev = before;
	ins_tail->next = after;
	if (after) after->prev = ins_tail;
	else doc->pf->tail = ins_tail;
	doc->pf->sentence_count += (long)ins_count - 1;
	destroy_sentence(target);
	return 0;
}

static void destroy_sentence(SentenceNode *sent) {
	if (!sent) return;
	WordNode *word = sent->head;
	while (word) {
		WordNode *next = word->next;
		free(word->text);
		free(word);
		word = next;
	}
	pthread_mutex_destroy(&sent->lock);
	free(sent);
}

static char *load_file_contents(const char *filename) {
	char path[PATH_MAX];
	int written = snprintf(path, sizeof(path), "%s/%s", g_storage_dir, filename);
	if (written < 0 || written >= (int)sizeof(path)) {
		errno = ENAMETOOLONG;
		return NULL;
	}
	FILE *fp = fopen(path, "r");
	if (!fp) {
		return NULL;
	}
	if (fseek(fp, 0, SEEK_END) != 0) {
		fclose(fp);
		return NULL;
	}
	long size = ftell(fp);
	if (size < 0) {
		fclose(fp);
		return NULL;
	}
	rewind(fp);
	size_t buf_size = (size_t)size;
	char *buf = calloc(buf_size + 1, 1);
	if (!buf) {
		fclose(fp);
		return NULL;
	}
	if (buf_size > 0) {
		if (fread(buf, 1, buf_size, fp) != buf_size) {
			free(buf);
			fclose(fp);
			return NULL;
		}
	}
	buf[buf_size] = '\0';
	fclose(fp);
	return buf;
}

static int write_file_contents(const char *filename, const char *content) {
	char path[PATH_MAX];
	char tmp_path[PATH_MAX];
	int written = snprintf(path, sizeof(path), "%s/%s", g_storage_dir, filename);
	if (written < 0 || written >= (int)sizeof(path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	int prefix = snprintf(tmp_path, sizeof(tmp_path), "%s/.write", g_storage_dir);
	if (prefix < 0 || prefix >= (int)sizeof(tmp_path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	int suffix = snprintf(tmp_path + prefix, sizeof(tmp_path) - prefix, "-%ld-%ld.tmp",
				(long)getpid(), (long)time(NULL));
	if (suffix < 0 || prefix + suffix >= (int)sizeof(tmp_path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	FILE *fp = fopen(tmp_path, "w");
	if (!fp) {
		return -1;
	}
	size_t len = strlen(content);
	if (len > 0 && fwrite(content, 1, len, fp) != len) {
		fclose(fp);
		unlink(tmp_path);
		errno = EIO;
		return -1;
	}
	fclose(fp);
	if (rename(tmp_path, path) != 0) {
		unlink(tmp_path);
		return -1;
	}
	return 0;
}

static int send_read_payload(int sockfd, const Message *request, const char *content) {
	size_t len = content ? strlen(content) : 0;
	if (len <= PAYLOAD_SIZE) {
		const char *payload = (len > 0) ? content : "";
		return sendmessage(sockfd, READ, ALL_OK, (char*)request->username, (char*)request->filename, (char*)payload);
	}
	char header[64];
	snprintf(header, sizeof(header), "BLOB %zu", len);
	if (sendmessage(sockfd, READ, ALL_OK, (char*)request->username, (char*)request->filename, header) < 0) {
		return -1;
	}
	if (send_blob(sockfd, content, len) < 0) {
		return -1;
	}
	return 0;
}

static void handle_read_operation(int sockfd, const Message *initial_msg, const char *peer_ip, int peer_port) {
	if (!initial_msg->filename[0]) {
		sendmessage(sockfd, READ, ERR_INVALID_ARG, (char*)initial_msg->username, (char*)initial_msg->filename, "Filename required");
		return;
	}
	char *content = load_file_contents(initial_msg->filename);
	if (!content) {
		ErrorCode err = (errno == ENOENT) ? ERR_FILE_NOT_FOUND : ERR_SYSTEM_FAILURE;
		const char *detail = (err == ERR_FILE_NOT_FOUND) ? "File not found" : "Read failed";
		sendmessage(sockfd, READ, err, (char*)initial_msg->username, (char*)initial_msg->filename, (char*)detail);
		return;
	}
	if (send_read_payload(sockfd, initial_msg, content) != 0) {
		log_event("SS", "ERROR", peer_ip, peer_port, initial_msg->username, READ, ERR_CONN_FAILED, "Failed to send READ data");
		free(content);
		return;
	}
	size_t bytes = strlen(content);
	char detail[128];
	snprintf(detail, sizeof(detail), "Served READ (%zu bytes)", bytes);
	log_response("SS", peer_ip, peer_port, initial_msg->username, READ, ALL_OK, detail);
	free(content);
}

static void handle_stream_operation(int sockfd, const Message *initial_msg, const char *peer_ip, int peer_port) {
	if (!initial_msg->filename[0]) {
		sendmessage(sockfd, STREAM, ERR_INVALID_ARG, (char*)initial_msg->username, (char*)initial_msg->filename, "Filename required");
		return;
	}
	char *content = load_file_contents(initial_msg->filename);
	if (!content) {
		ErrorCode err = (errno == ENOENT) ? ERR_FILE_NOT_FOUND : ERR_SYSTEM_FAILURE;
		const char *detail = (err == ERR_FILE_NOT_FOUND) ? "File not found" : "Read failed";
		sendmessage(sockfd, STREAM, err, (char*)initial_msg->username, (char*)initial_msg->filename, (char*)detail);
		return;
	}
	if (sendmessage(sockfd, STREAM, ALL_OK, (char*)initial_msg->username, (char*)initial_msg->filename, "BEGIN") < 0) {
		log_event("SS", "ERROR", peer_ip, peer_port, initial_msg->username, STREAM, ERR_CONN_FAILED, "Failed to send STREAM BEGIN");
		free(content);
		return;
	}
	size_t word_count = 0;
	const char *ptr = content;
	while (*ptr) {
		while (*ptr && isspace((unsigned char)*ptr)) ptr++;
		if (!*ptr) break;
		char word_buf[PAYLOAD_SIZE];
		size_t wlen = 0;
		while (*ptr && !isspace((unsigned char)*ptr)) {
			if (wlen + 1 >= sizeof(word_buf)) {
				sendmessage(sockfd, STREAM, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, (char*)initial_msg->filename, "Word too long");
				free(content);
				return;
			}
			word_buf[wlen++] = *ptr++;
		}
		word_buf[wlen] = '\0';
		if (sendmessage(sockfd, STREAM, ALL_OK, (char*)initial_msg->username, (char*)initial_msg->filename, word_buf) < 0) {
			log_event("SS", "ERROR", peer_ip, peer_port, initial_msg->username, STREAM, ERR_CONN_FAILED, "Failed to stream word");
			free(content);
			return;
		}
		usleep(100000);
		word_count++;
	}
	if (sendmessage(sockfd, STREAM, ALL_OK, (char*)initial_msg->username, (char*)initial_msg->filename, "END") < 0) {
		log_event("SS", "ERROR", peer_ip, peer_port, initial_msg->username, STREAM, ERR_CONN_FAILED, "Failed to send STREAM END");
		free(content);
		return;
	}
	char detail[128];
	snprintf(detail, sizeof(detail), "Streamed %zu words", word_count);
	log_response("SS", peer_ip, peer_port, initial_msg->username, STREAM, ALL_OK, detail);
	free(content);
}

static void handle_undo_operation(int sockfd, const Message *initial_msg, const char *peer_ip, int peer_port) {
	if (!initial_msg->filename[0]) {
		sendmessage(sockfd, UNDO, ERR_INVALID_ARG, (char*)initial_msg->username, (char*)initial_msg->filename, "Filename required");
		return;
	}
	if (file_has_active_writers(initial_msg->filename)) {
		sendmessage(sockfd, UNDO, ERR_SENT_LOCKED, (char*)initial_msg->username, (char*)initial_msg->filename, "File busy with active writers");
		return;
	}
	char *snapshot = load_undo_snapshot(initial_msg->filename);
	if (!snapshot) {
		ErrorCode err = (errno == ENOENT) ? ERR_NOTHING_TO_UNDO : ERR_SYSTEM_FAILURE;
		const char *detail = (err == ERR_NOTHING_TO_UNDO) ? "No undo available" : "Failed to load undo snapshot";
		sendmessage(sockfd, UNDO, err, (char*)initial_msg->username, (char*)initial_msg->filename, (char*)detail);
		return;
	}
	if (write_file_contents(initial_msg->filename, snapshot) != 0) {
		char detail[128];
		snprintf(detail, sizeof(detail), "Undo write failed: %s", strerror(errno));
		sendmessage(sockfd, UNDO, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, (char*)initial_msg->filename, detail);
		free(snapshot);
		return;
	}
	free(snapshot);
	if (clear_undo_snapshot(initial_msg->filename) != 0) {
		char warn[128];
		snprintf(warn, sizeof(warn), "Unable to clear undo snapshot: %s", strerror(errno));
		log_event("SS", "WARN", peer_ip, peer_port, initial_msg->username, UNDO, ERR_SYSTEM_FAILURE, warn);
	}
	sendmessage(sockfd, UNDO, ALL_OK, (char*)initial_msg->username, (char*)initial_msg->filename, "UNDO_APPLIED");
	log_response("SS", peer_ip, peer_port, initial_msg->username, UNDO, ALL_OK, "Undo applied");
}

static char *sentence_to_string(const SentenceNode *sent) {
	if (!sent) return strdup("(invalid sentence)");
	size_t cap = 128;
	char *buf = malloc(cap);
	if (!buf) return NULL;
	buf[0] = '\0';
	size_t len = 0;
	int wrote_word = 0;
	WordNode *word = sent->head;
	while (word) {
		size_t wlen = strlen(word->text);
		if (len + wlen + 2 >= cap) {
			cap *= 2;
			char *nb = realloc(buf, cap);
			if (!nb) {
				free(buf);
				return NULL;
			}
			buf = nb;
		}
		if (!word->is_delimiter && wrote_word) buf[len++] = ' ';
		memcpy(buf + len, word->text, wlen);
		len += wlen;
		if (!word->is_delimiter) wrote_word = 1;
		word = word->next;
	}
	if (sent->delimiter) {
		if (len + 2 >= cap) {
			cap *= 2;
			char *nb = realloc(buf, cap);
			if (!nb) {
				free(buf);
				return NULL;
			}
			buf = nb;
		}
		buf[len++] = sent->delimiter;
	}
	buf[len] = '\0';
	return buf;
}

static void handle_write_session(int sockfd, const Message *initial_msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	strncpy(filename, initial_msg->filename, sizeof(filename) - 1);
	filename[sizeof(filename) - 1] = '\0';
	if (filename[0] == '\0') {
		sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)initial_msg->username, NULL, "Filename required");
		return;
	}
	char payload_copy[PAYLOAD_SIZE + 1] = {0};
	size_t copy_len = initial_msg->payload_len;
	if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
	memcpy(payload_copy, initial_msg->payload, copy_len);
	payload_copy[copy_len] = '\0';
	char *saveptr = NULL;
	char *cmd = strtok_r(payload_copy, " \t\r\n", &saveptr);
	if (!cmd || strcasecmp(cmd, "BEGIN") != 0) {
		sendmessage(sockfd, WRITE, ERR_INVALID_CMD, (char*)initial_msg->username, filename, "Expected BEGIN");
		return;
	}
	char *idx_tok = strtok_r(NULL, " \t\r\n", &saveptr);
	if (!idx_tok) {
		sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)initial_msg->username, filename, "Missing sentence index");
		return;
	}
	char *endptr = NULL;
	long sentence_idx_long = strtol(idx_tok, &endptr, 10);
	if (idx_tok == endptr || sentence_idx_long < 0) {
		sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)initial_msg->username, filename, "Invalid sentence index");
		return;
	}
	size_t sentence_idx = (size_t)sentence_idx_long;
	DocumentState *doc_state = get_document_state(filename);
	if (!doc_state) {
		sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Lock state unavailable");
		return;
	}
	SentenceNode *locked_sentence = NULL;
	int append_mode = 0;
	char *snapshot = NULL;
	int lock_rc = document_lock_sentence(doc_state, filename, sentence_idx, &locked_sentence, &append_mode, &snapshot);
	if (lock_rc != ALL_OK) {
		ErrorCode err = lock_rc;
		if (err == ALL_OK) err = ERR_SYSTEM_FAILURE;
		sendmessage(sockfd, WRITE, err, (char*)initial_msg->username, filename,
			(err == ERR_SENT_LOCKED) ? "Sentence locked" :
			(err == ERR_SENT_INDEX ? "Sentence index out of range" : "Lock failed"));
		return;
	}
	ParsedFile *pf = parse_file_content(snapshot);
	free(snapshot);
	if (!pf) {
		sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Parse failed");
		document_unlock_sentence(doc_state, locked_sentence, append_mode);
		return;
	}
	int appended_sentence = append_mode;
	SentenceNode *sentence = parser_get_sentence(pf, sentence_idx);
	if (!sentence) {
		if (sentence_idx == pf->sentence_count) {
			SentenceNode *last = pf->tail;
			if (!last || last->delimiter == '\0') {
				sendmessage(sockfd, WRITE, ERR_SENT_INDEX, (char*)initial_msg->username, filename, "Append requires trailing delimiter");
				free_parsed_file(pf);
				document_unlock_sentence(doc_state, locked_sentence, append_mode);
				return;
			}
			sentence = parser_append_sentence(pf);
			if (!sentence) {
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Unable to append sentence");
				free_parsed_file(pf);
				document_unlock_sentence(doc_state, locked_sentence, append_mode);
				return;
			}
			appended_sentence = 1;
		} else {
			sendmessage(sockfd, WRITE, ERR_SENT_INDEX, (char*)initial_msg->username, filename, "Sentence index out of range");
			free_parsed_file(pf);
			document_unlock_sentence(doc_state, locked_sentence, append_mode);
			return;
		}
	}
	char *preview = sentence_to_string(sentence);
	char intro[PAYLOAD_SIZE];
	if (preview && preview[0] != '\0') {
		snprintf(intro, sizeof(intro), "Locked sentence %zu. Current text: %s", sentence_idx, preview);
		free(preview);
	} else {
		if (preview) free(preview);
		if (appended_sentence) {
			snprintf(intro, sizeof(intro), "Locked new sentence %zu (append).", sentence_idx);
		} else {
			snprintf(intro, sizeof(intro), "Locked sentence %zu.", sentence_idx);
		}
	}
	sendmessage(sockfd, WRITE, ALL_OK, (char*)initial_msg->username, filename, intro);
	int session_active = 1;
	while (session_active) {
		Message step = {0};
		if (recvmessage(sockfd, &step) < 0) {
			log_event("SS", "ERROR", peer_ip, peer_port, initial_msg->username, WRITE, ERR_CONN_FAILED, "WRITE session connection lost");
			break;
		}
		if (step.opn != WRITE) {
			sendmessage(sockfd, WRITE, ERR_INVALID_CMD, (char*)initial_msg->username, filename, "WRITE session expected WRITE op");
			if (step.blob) free(step.blob);
			continue;
		}
		char step_buf[PAYLOAD_SIZE + 1];
		size_t step_len = step.payload_len;
		if (step_len > PAYLOAD_SIZE) step_len = PAYLOAD_SIZE;
		memcpy(step_buf, step.payload, step_len);
		step_buf[step_len] = '\0';
		char *step_ptr = NULL;
		char *step_cmd = strtok_r(step_buf, " \t\r\n", &step_ptr);
		if (!step_cmd) {
			sendmessage(sockfd, WRITE, ERR_INVALID_CMD, (char*)initial_msg->username, filename, "Empty command");
			if (step.blob) free(step.blob);
			continue;
		}
		if (strcasecmp(step_cmd, "APPLY") == 0) {
			char *word_tok = strtok_r(NULL, " \t\r\n", &step_ptr);
			char *content_tok = strtok_r(NULL, "", &step_ptr);
			if (!word_tok || !content_tok) {
				sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)initial_msg->username, filename, "Format: APPLY <index> <content>");
				if (step.blob) free(step.blob);
				continue;
			}
			trim_string(content_tok);
			if (content_tok[0] == '\0') {
				sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)initial_msg->username, filename, "Content cannot be empty");
				if (step.blob) free(step.blob);
				continue;
			}
			char *wend = NULL;
			long word_idx_long = strtol(word_tok, &wend, 10);
			if (word_tok == wend || word_idx_long < 0) {
				sendmessage(sockfd, WRITE, ERR_WORD_INDEX, (char*)initial_msg->username, filename, "Invalid word index");
				if (step.blob) free(step.blob);
				continue;
			}
			SentenceNode *cur_sentence = parser_get_sentence(pf, sentence_idx);
			if (!cur_sentence) {
				sendmessage(sockfd, WRITE, ERR_SENT_INDEX, (char*)initial_msg->username, filename, "Sentence vanished");
				if (step.blob) free(step.blob);
				continue;
			}
			size_t word_count = cur_sentence->word_count;
			if ((size_t)word_idx_long > word_count) {
				sendmessage(sockfd, WRITE, ERR_WORD_INDEX, (char*)initial_msg->username, filename, "Word index out of range");
				if (step.blob) free(step.blob);
				continue;
			}
			size_t insert_pos = (size_t)word_idx_long;
			if (insert_word(pf, sentence_idx, insert_pos, content_tok) != 0) {
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Insert failed");
			} else {
				SentenceNode *updated = parser_get_sentence(pf, sentence_idx);
				char *text = sentence_to_string(updated);
				if (text) {
					sendmessage(sockfd, WRITE, ALL_OK, (char*)initial_msg->username, filename, text);
					free(text);
				} else {
					sendmessage(sockfd, WRITE, ALL_OK, (char*)initial_msg->username, filename, "Sentence updated.");
				}
			}
		} else if (strcasecmp(step_cmd, "COMMIT") == 0) {
			SentenceNode *updated_sentence = parser_get_sentence(pf, sentence_idx);
			if (!updated_sentence) {
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Sentence missing during commit");
				if (step.blob) free(step.blob);
				continue;
			}
			char *final_text = sentence_to_string(updated_sentence);
			if (!final_text) {
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Serialize sentence failed");
				if (step.blob) free(step.blob);
				continue;
			}
			ParsedFile *replacement = parse_file_content(final_text);
			free(final_text);
			if (!replacement) {
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Parse replacement failed");
				if (step.blob) free(step.blob);
				continue;
			}
			pthread_mutex_lock(&doc_state->mutex);
			char *pre_commit = serialize_parsed_file(doc_state->pf);
			if (!pre_commit) {
				pthread_mutex_unlock(&doc_state->mutex);
				free_parsed_file(replacement);
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Snapshot failed");
				if (step.blob) free(step.blob);
				continue;
			}
			if (store_undo_snapshot(filename, pre_commit) != 0) {
				char detail[128];
				snprintf(detail, sizeof(detail), "Undo snapshot failed: %s", strerror(errno));
				pthread_mutex_unlock(&doc_state->mutex);
				free(pre_commit);
				free_parsed_file(replacement);
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, detail);
				if (step.blob) free(step.blob);
				continue;
			}
			if (document_apply_sentence_update(doc_state, locked_sentence, append_mode, replacement) != 0) {
				pthread_mutex_unlock(&doc_state->mutex);
				free(pre_commit);
				free_parsed_file(replacement);
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Apply update failed");
				if (step.blob) free(step.blob);
				continue;
			}
			free_parsed_file(replacement);
			replacement = NULL;
			size_t total_words = get_total_word_count(doc_state->pf);
			size_t total_chars = get_total_char_count(doc_state->pf);
			char *updated_serialized = serialize_parsed_file(doc_state->pf);
			if (!updated_serialized) {
				// revert to previous snapshot
				document_reload_from_text(doc_state, pre_commit);
				pthread_mutex_unlock(&doc_state->mutex);
				free(pre_commit);
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, "Serialize failed");
				if (step.blob) free(step.blob);
				continue;
			}
			if (write_file_contents(filename, updated_serialized) != 0) {
				char detail[128];
				snprintf(detail, sizeof(detail), "Write failed: %s", strerror(errno));
				document_reload_from_text(doc_state, pre_commit);
				pthread_mutex_unlock(&doc_state->mutex);
				free(pre_commit);
				free(updated_serialized);
				sendmessage(sockfd, WRITE, ERR_SYSTEM_FAILURE, (char*)initial_msg->username, filename, detail);
				if (step.blob) free(step.blob);
				continue;
			}
			pthread_mutex_unlock(&doc_state->mutex);
			free(pre_commit);
			free(updated_serialized);
			char detail[128];
			snprintf(detail, sizeof(detail), "OK %zu %zu", total_words, total_chars);
			sendmessage(sockfd, WRITE, ALL_OK, (char*)initial_msg->username, filename, detail);
			session_active = 0;
		} else if (strcasecmp(step_cmd, "ABORT") == 0) {
			sendmessage(sockfd, WRITE, ERR_INVALID_CMD, (char*)initial_msg->username, filename, "WRITE session aborted");
			session_active = 0;
		} else {
			sendmessage(sockfd, WRITE, ERR_INVALID_CMD, (char*)initial_msg->username, filename, "Unknown WRITE command");
		}
		if (step.blob) free(step.blob);
	}
	free_parsed_file(pf);
	document_unlock_sentence(doc_state, locked_sentence, append_mode);
}

static int create_empty_file(const char *filename) {
	char path[PATH_MAX];
	int written = snprintf(path, sizeof(path), "%s/%s", g_storage_dir, filename);
	if (written < 0 || written >= (int)sizeof(path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	int fd = open(path, O_CREAT | O_EXCL | O_WRONLY, 0644);
	if (fd < 0) {
		return -1;
	}
	close(fd);
	return 0;
}

static int delete_file_on_disk(const char *filename) {
	char path[PATH_MAX];
	int written = snprintf(path, sizeof(path), "%s/%s", g_storage_dir, filename);
	if (written < 0 || written >= (int)sizeof(path)) {
		errno = ENAMETOOLONG;
		return -1;
	}
	if (file_has_active_writers(filename)) {
		errno = EBUSY;
		return -1;
	}
	if (unlink(path) == 0) {
		clear_undo_snapshot(filename);
		return 0;
	}
	return -1;
}

// Enumerate files in a directory and return CSV string
static char *list_files_in_dir(const char *dirpath) {
	DIR *d = opendir(dirpath);
	if (!d) {
		perror("opendir");
		return NULL;
	}
	
	struct dirent *ent;
	size_t bufcap = 4096;
	char *buf = malloc(bufcap);
	if (!buf) {
		closedir(d);
		return NULL;
	}
	buf[0] = '\0';
	size_t len = 0;
	
	while ((ent = readdir(d)) != NULL) {
		// Skip . and ..
		if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0)
			continue;
		
		// Check if regular file (use stat for portability)
		char fullpath[PATH_MAX];
		snprintf(fullpath, sizeof(fullpath), "%s/%s", dirpath, ent->d_name);
		struct stat st;
		if (stat(fullpath, &st) == 0 && S_ISREG(st.st_mode)) {
			size_t need = strlen(ent->d_name) + 2; // +1 for comma, +1 for null
			if (len + need >= bufcap) {
				bufcap *= 2;
				char *nb = realloc(buf, bufcap);
				if (!nb) {
					free(buf);
					closedir(d);
					return NULL;
				}
				buf = nb;
			}
			if (len > 0) {
				buf[len++] = ',';
				buf[len] = '\0';
			}
			strcat(buf, ent->d_name);
			len = strlen(buf);
		}
	}
	closedir(d);
	return buf;
}

// Client listener thread (accepts connections from clients for READ/WRITE/etc)

static void *client_session_thread(void *arg) {
	int sockfd = *(int*)arg;
	free(arg);
	struct sockaddr_in peer;
	socklen_t plen = sizeof(peer);
	char peer_ip[INET_ADDRSTRLEN] = "unknown";
	int peer_port = 0;
	if (getpeername(sockfd, (struct sockaddr*)&peer, &plen) == 0) {
		inet_ntop(AF_INET, &peer.sin_addr, peer_ip, sizeof(peer_ip));
		peer_port = ntohs(peer.sin_port);
	}

	while (1) {
		Message msg = {0};
		errno = 0;
		if (recvmessage(sockfd, &msg) < 0) {
			if (errno == 0) {
				log_event("SS", "INFO", peer_ip, peer_port, NULL, NONE, ALL_OK, "client disconnected");
			} else {
				log_event("SS", "ERROR", peer_ip, peer_port, NULL, NONE, ERR_CONN_FAILED, "recvmessage failed");
			}
			break;
		}
		log_request("SS", peer_ip, peer_port, msg.username[0] ? msg.username : NULL, msg.opn,
				msg.payload_len > 0 ? msg.payload : NULL);
		if (msg.opn == WRITE) {
			handle_write_session(sockfd, &msg, peer_ip, peer_port);
			if (msg.blob) free(msg.blob);
			break;
		} else if (msg.opn == READ) {
			handle_read_operation(sockfd, &msg, peer_ip, peer_port);
			if (msg.blob) free(msg.blob);
			break;
		} else if (msg.opn == STREAM) {
			handle_stream_operation(sockfd, &msg, peer_ip, peer_port);
			if (msg.blob) free(msg.blob);
			break;
		} else if (msg.opn == UNDO) {
			handle_undo_operation(sockfd, &msg, peer_ip, peer_port);
			if (msg.blob) free(msg.blob);
			break;
		} else if (msg.opn == CREATE) {
			if (!msg.filename[0]) {
				sendmessage(sockfd, CREATE, ERR_INVALID_ARG, msg.username, msg.filename, "Missing filename");
			} else if (create_empty_file(msg.filename) == 0) {
				sendmessage(sockfd, CREATE, ALL_OK, msg.username, msg.filename, "FILE_CREATED");
			} else if (errno == EEXIST) {
				sendmessage(sockfd, CREATE, ERR_FILE_EXISTS, msg.username, msg.filename, "File exists");
			} else {
				char detail[128];
				snprintf(detail, sizeof(detail), "create failed: %s", strerror(errno));
				sendmessage(sockfd, CREATE, ERR_SYSTEM_FAILURE, msg.username, msg.filename, detail);
			}
			if (msg.blob) free(msg.blob);
			break;
		} else if (msg.opn == DELETE) {
			if (!msg.filename[0]) {
				sendmessage(sockfd, DELETE, ERR_INVALID_ARG, msg.username, msg.filename, "Missing filename");
			} else if (delete_file_on_disk(msg.filename) == 0) {
				sendmessage(sockfd, DELETE, ALL_OK, msg.username, msg.filename, "FILE_DELETED");
			} else if (errno == ENOENT) {
				sendmessage(sockfd, DELETE, ERR_FILE_NOT_FOUND, msg.username, msg.filename, "File not found");
			} else if (errno == EBUSY) {
				sendmessage(sockfd, DELETE, ERR_SENT_LOCKED, msg.username, msg.filename, "File is busy");
			} else {
				char detail[128];
				snprintf(detail, sizeof(detail), "delete failed: %s", strerror(errno));
				sendmessage(sockfd, DELETE, ERR_SYSTEM_FAILURE, msg.username, msg.filename, detail);
			}
			if (msg.blob) free(msg.blob);
			break;
		} else {
			sendmessage(sockfd, msg.opn, ERR_INVALID_CMD, msg.username, msg.filename, "NOT_IMPLEMENTED");
			if (msg.blob) free(msg.blob);
			break;
		}
	}
	destroysocket(sockfd);
	return NULL;
}

static void *client_listener_thread(void *arg) {
	int port = *(int*)arg;
	free(arg);

	int serverfd = serverinit(port);
	if (serverfd < 0) {
		log_event("SS", "ERROR", NULL, port, NULL, NONE, ERR_SYSTEM_FAILURE, "client listener init failed");
		return NULL;
	}

	char msg[128];
	snprintf(msg, sizeof(msg), "Client listener started on port %d", port);
	log_event("SS", "STARTUP", NULL, port, NULL, NONE, ALL_OK, msg);

	while (1) {
		int cfd = acceptconn(serverfd);
		if (cfd < 0) continue;

		int *arg_sock = malloc(sizeof(int));
		if (!arg_sock) {
			destroysocket(cfd);
			continue;
		}
		*arg_sock = cfd;
		pthread_t tid;
		if (pthread_create(&tid, NULL, client_session_thread, arg_sock) != 0) {
			free(arg_sock);
			destroysocket(cfd);
			continue;
		}
		pthread_detach(tid);
	}

	return NULL;
}


int main(int argc, char **argv) {
	if (argc < 4) {
		fprintf(stderr, "Usage: %s <nm_ip> <nm_port> <client_port> [storage_dir]\n", argv[0]);
		fprintf(stderr, "       storage_dir optional; defaults to auto-created storageserver/serverN\n");
		return 1;
	}
	
	const char *nm_ip = argv[1];
	int nm_port = atoi(argv[2]);
	int client_port = atoi(argv[3]);
	const char *storage_root = (argc >= 5) ? argv[4] : NULL;
	srand((unsigned)time(NULL) ^ (unsigned)getpid());
	if (configure_storage_paths(storage_root, client_port) != 0) {
		if (storage_root && *storage_root) {
			fprintf(stderr, "[SS] Failed to configure storage paths at %s: %s\n", storage_root, strerror(errno));
		} else {
			fprintf(stderr, "[SS] Failed to auto-configure storage paths: %s\n", strerror(errno));
		}
		return 1;
	}
	
	// Initialize logging (no stdout echo for SS)
	char log_path[PATH_MAX];
	const char *log_basename = path_basename(g_ss_root_dir);
	if (!log_basename || !*log_basename) {
		log_basename = g_ss_id;
	}
	int log_written = snprintf(log_path, sizeof(log_path), "%s/%s.log", g_ss_root_dir, log_basename);
	if (log_written < 0 || log_written >= (int)sizeof(log_path)) {
		fprintf(stderr, "[SS] Failed to build log path for %s\n", g_ss_root_dir);
		return 1;
	}
	if (log_init(log_path, 0) < 0) {
		fprintf(stderr, "[SS] Failed to initialize logging\n");
		return 1;
	}
	
	// Log SS startup
	char startup_msg[256];
	snprintf(startup_msg, sizeof(startup_msg),
	         "SS starting: id=%s nm=%s:%d client_port=%d",
	         g_ss_id, nm_ip, nm_port, client_port);
	log_event("SS", "STARTUP", NULL, 0, NULL, NONE, ALL_OK, startup_msg);
	
	// Enumerate files in storage directory
	char *files = list_files_in_dir(g_storage_dir);
	if (!files) {
		log_event("SS", "ERROR", NULL, 0, NULL, NONE, ERR_SYSTEM_FAILURE, "failed to list files");
		files = strdup(""); // empty list
	}
	
	// Build registration payload: REGISTER_SS;clientport:<port>;files:<csv>
	char payload[8192];
	snprintf(payload, sizeof(payload), "REGISTER_SS;id:%s;clientport:%d;files:%s", g_ss_id, client_port, files);
	
	// Connect to Name Server
	int nm_sockfd = clientinit(nm_ip, nm_port);
	if (nm_sockfd < 0) {
		log_event("SS", "ERROR", nm_ip, nm_port, NULL, NONE, ERR_CONN_FAILED, "failed to connect to NM");
		fprintf(stderr, "[SS] Failed to connect to NM %s:%d\n", nm_ip, nm_port);
		free(files);
		log_close();
		return 1;
	}
	
	// Log registration attempt
	char reg_detail[512];
	snprintf(reg_detail, sizeof(reg_detail), "Registering with NM: clientport=%d, files=%s", 
	         client_port, files);
	log_request("SS", nm_ip, nm_port, NULL, NONE, reg_detail);
	
	// Send registration message
	if (sendmessage(nm_sockfd, NONE, ALL_OK, NULL, NULL, payload) < 0) {
		log_event("SS", "ERROR", nm_ip, nm_port, NULL, NONE, ERR_CONN_FAILED, "sendmessage failed");
		fprintf(stderr, "[SS] Failed to send registration\n");
		destroysocket(nm_sockfd);
		free(files);
		log_close();
		return 1;
	}
	
	// Receive acknowledgment from NM
	Message reply;
	if (recvmessage(nm_sockfd, &reply) == 0) {
		// Log NM response
		log_response("SS", nm_ip, nm_port, NULL, NONE, reply.err, 
		            reply.payload_len > 0 ? reply.payload : "ACK");
		
		if (reply.err != ALL_OK) {
			const char *detail = NULL;
			if (reply.payload_len > 0) {
				detail = reply.payload;
			} else if (reply.blob && reply.blob_len > 0) {
				detail = reply.blob;
			}
			char errbuf[256];
			format_error_message(reply.err, detail, errbuf, sizeof(errbuf));
			fprintf(stderr, "[SS] NM rejected registration: %s\n", errbuf);
			if (reply.blob) free(reply.blob);
			destroysocket(nm_sockfd);
			free(files);
			log_close();
			return 1;
		}
		if (reply.blob) free(reply.blob);
	} else {
		log_event("SS", "ERROR", nm_ip, nm_port, NULL, NONE, ERR_CONN_FAILED, "recvmessage failed");
		destroysocket(nm_sockfd);
		free(files);
		log_close();
		return 1;
	}
	
	// Close NM connection (can reconnect later for heartbeat or commands)
	destroysocket(nm_sockfd);
	
	// Start client listener thread
	int *arg = malloc(sizeof(int));
	if (!arg) {
		log_event("SS", "ERROR", NULL, 0, NULL, NONE, ERR_SYSTEM_FAILURE, "malloc failed");
		free(files);
		log_close();
		return 1;
	}
	*arg = client_port;
	
	pthread_t listener_tid;
	if (pthread_create(&listener_tid, NULL, client_listener_thread, arg) != 0) {
		log_event("SS", "ERROR", NULL, 0, NULL, NONE, ERR_SYSTEM_FAILURE, "pthread_create failed");
		free(arg);
		free(files);
		log_close();
		return 1;
	}
	pthread_detach(listener_tid);
	
	// Main loop: keep process alive
	// TODO: accept commands from NM, implement heartbeat, etc.
	log_event("SS", "STARTUP", NULL, client_port, NULL, NONE, ALL_OK, "SS initialized and running");
	
	while (1) {
		sleep(60); // placeholder
	}
	
	free(files);
	log_close();
	return 0;
}
