#ifndef METADATA_H
#define METADATA_H

#include "../shared/shared.h"
#include "../shared/error.h"

#define METADATA_MAX_SS_ID SS_ID_LENGTH

#define ACL_FLAG_OWNER_READ  (1u << 0)
#define ACL_FLAG_OWNER_WRITE (1u << 1)
#define ACL_FLAG_WORLD_READ  (1u << 2)
#define ACL_FLAG_WORLD_WRITE (1u << 3)
#define ACL_DEFAULT_FLAGS    (ACL_FLAG_OWNER_READ | ACL_FLAG_OWNER_WRITE)

typedef struct {
    char ss_id[METADATA_MAX_SS_ID];
    char ip[INET_ADDRSTRLEN];
    int nm_port;
    int client_port;
    time_t last_seen;
    int is_active;
    size_t assigned_files;
} StorageServerSnapshot;

typedef struct {
    char filename[FNAME_LENGTH];
    char owner[UNAME_LENGTH];
    uint32_t acl_flags;
    char primary_ss_id[METADATA_MAX_SS_ID];
    time_t ctime;
    time_t mtime;
    time_t last_access;
    char last_access_user[UNAME_LENGTH];
    size_t word_count;
    size_t char_count;
    uint32_t active_writers;
    uint8_t user_visible;
} FileMetadataSnapshot;

typedef struct {
    char username[UNAME_LENGTH];
    time_t last_seen;
} UserSnapshot;

#define METADATA_ERR_EXISTS   -2
#define METADATA_ERR_NO_SS    -3

int metadata_init(const char *persist_path);
void metadata_shutdown(void);

int metadata_register_storage_server(const char *ss_id,
                                     const char *ip,
                                     int nm_port,
                                     int client_port,
                                     const char *files_csv);

int metadata_mark_storage_server_down(const char *ss_id);

int metadata_link_file_to_storage(const char *filename,
                                  const char *owner,
                                  uint32_t acl_flags,
                                  const char *ss_id);

int metadata_lookup_file(const char *filename,
                         FileMetadataSnapshot *out_file,
                         StorageServerSnapshot *out_ss);

int metadata_list_files(FileMetadataSnapshot **out_files,
                        size_t *out_count);

void metadata_free_file_list(FileMetadataSnapshot *files);

int metadata_pick_storage_server(StorageServerSnapshot *out_ss);

int metadata_create_file_record(const char *filename,
                                const char *owner,
                                uint32_t acl_flags,
                                const char *ss_id,
                                size_t word_count,
                                size_t char_count,
                                time_t last_access_ts);

int metadata_register_user(const char *username);

int metadata_list_users(UserSnapshot **out_users,
                        size_t *out_count);

void metadata_free_user_list(UserSnapshot *users);

int metadata_user_exists(const char *username);

int metadata_grant_access(const char *filename,
                          const char *acting_user,
                          const char *target_user,
                          int grant_write);

int metadata_remove_access(const char *filename,
                           const char *acting_user,
                           const char *target_user);

int metadata_user_has_access(const char *filename,
                             const char *username,
                             int require_write);

int metadata_get_file_details(const char *filename,
                              FileMetadataSnapshot *out_file,
                              char **out_acl_desc);

int metadata_record_access(const char *filename,
                           const char *username,
                           int is_write);

int metadata_delete_file(const char *filename);

int metadata_begin_write_session(const char *filename,
                                 const char *username);

int metadata_finish_write_session(const char *filename,
                                  const char *username,
                                  size_t word_count,
                                  size_t char_count,
                                  int success);

int metadata_can_undo(const char *filename);

int metadata_apply_undo(const char *filename);

#endif // METADATA_H
