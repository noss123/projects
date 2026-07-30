#include "../shared/nwutils.h"
#include "../shared/logging.h"
#include "metadata.h"

#include <fcntl.h>
#include <sys/wait.h>

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <unistd.h>

typedef struct {
	int include_all;
	int long_format;
} ViewOptions;

static void parse_view_flags(const Message *msg, ViewOptions *opts) {
	if (!opts) return;
	opts->include_all = 0;
	opts->long_format = 0;
	if (!msg || msg->payload_len == 0) return;
	char flags[PAYLOAD_SIZE + 1];
	size_t len = msg->payload_len;
	if (len > PAYLOAD_SIZE) len = PAYLOAD_SIZE;
	memcpy(flags, msg->payload, len);
	flags[len] = '\0';
	int collecting = 0;
	for (size_t i = 0; i < len; ++i) {
		unsigned char ch = (unsigned char)flags[i];
		if (ch == '-') {
			collecting = 1;
			continue;
		}
		if (isspace(ch)) {
			collecting = 0;
			continue;
		}
		if (!collecting) continue;
		char c = tolower(ch);
		if (c == 'a') opts->include_all = 1;
		if (c == 'l') opts->long_format = 1;
	}
}

static int user_has_read_access(const FileMetadataSnapshot *file, const char *username) {
	if (!file) return 0;
	if (username && username[0] && strncmp(file->owner, username, UNAME_LENGTH) == 0) return 1;
	if (file->acl_flags & ACL_FLAG_WORLD_READ) return 1;
	if (!username || !username[0]) return 0;
	int allowed = metadata_user_has_access(file->filename, username, 0);
	return allowed > 0;
}

static int append_text(char **buf, size_t *cap, size_t *len, const char *text) {
	if (!buf || !cap || !len || !text) return -1;
	if (!*buf) {
		*cap = 1024;
		*buf = malloc(*cap);
		if (!*buf) return -1;
		(*buf)[0] = '\0';
		*len = 0;
	}
	size_t need = strlen(text);
	while (*len + need + 1 > *cap) {
		size_t newcap = (*cap) * 2;
		if (newcap < *len + need + 1) newcap = *len + need + 1;
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

static int append_bytes(char **buf, size_t *cap, size_t *len, const char *data, size_t data_len) {
	if (!buf || !cap || !len || (!data && data_len > 0)) return -1;
	if (!*buf) {
		*cap = (data_len + 1 > 1024) ? (data_len + 1) : 1024;
		*buf = malloc(*cap);
		if (!*buf) return -1;
		*len = 0;
	}
	while (*len + data_len + 1 > *cap) {
		size_t newcap = (*cap) * 2;
		if (newcap < *len + data_len + 1) newcap = *len + data_len + 1;
		char *nb = realloc(*buf, newcap);
		if (!nb) return -1;
		*buf = nb;
		*cap = newcap;
	}
	if (data_len > 0) memcpy(*buf + *len, data, data_len);
	*len += data_len;
	(*buf)[*len] = '\0';
	return 0;
}

static void trim_spaces(char *s) {
	if (!s) return;
	size_t len = strlen(s);
	size_t start = 0;
	while (start < len && isspace((unsigned char)s[start])) start++;
	size_t end = len;
	while (end > start && isspace((unsigned char)s[end - 1])) end--;
	if (start > 0) memmove(s, s + start, end - start);
	s[end - start] = '\0';
}

static int extract_filename_from_msg(const Message *msg, char *out, size_t out_len) {
	if (!msg || !out || out_len == 0) return -1;
	out[0] = '\0';
	if (msg->filename[0]) {
		strncpy(out, msg->filename, out_len - 1);
		out[out_len - 1] = '\0';
	} else if (msg->payload_len > 0) {
		size_t len = msg->payload_len;
		if (len >= out_len) len = out_len - 1;
		memcpy(out, msg->payload, len);
		out[len] = '\0';
	}
	trim_spaces(out);
	return (out[0] == '\0') ? -1 : 0;
}

static ErrorCode ensure_access_from_snapshot(const FileMetadataSnapshot *file,
				       const char *username,
				       int require_write) {
	if (!file) return ERR_FILE_NOT_FOUND;
	if (!username || !*username) {
		return ERR_UNAUTHORISED;
	}
	if (strncmp(file->owner, username, UNAME_LENGTH) == 0) {
		return ALL_OK;
	}
	if (!require_write && (file->acl_flags & ACL_FLAG_WORLD_READ)) {
		return ALL_OK;
	}
	if (require_write && (file->acl_flags & ACL_FLAG_WORLD_WRITE)) {
		return ALL_OK;
	}
	int allowed = metadata_user_has_access(file->filename, username, require_write);
	if (allowed < 0) {
		return ERR_SYSTEM_FAILURE;
	}
	return allowed ? ALL_OK : ERR_UNAUTHORISED;
}

static void format_time_string(time_t ts, char *out, size_t len) {
	if (!out || len == 0) return;
	if (ts == 0) {
		strncpy(out, "N/A", len - 1);
		out[len - 1] = '\0';
		return;
	}
	struct tm tmres;
	localtime_r(&ts, &tmres);
	strftime(out, len, "%Y-%m-%d %H:%M", &tmres);
}

static ErrorCode collect_message_content(int sockfd, Message *reply, char **out, size_t *out_len) {
	if (!reply || !out || !out_len) return ERR_SYSTEM_FAILURE;
	*out = NULL;
	*out_len = 0;
	if (reply->payload_len >= 4 && strncasecmp(reply->payload, "BLOB", 4) == 0) {
		void *buf = NULL;
		size_t len = 0;
		if (recv_blob(sockfd, &buf, &len) < 0) {
			return ERR_CONN_FAILED;
		}
		char *copy = malloc(len + 1);
		if (!copy) {
			free(buf);
			return ERR_SYSTEM_FAILURE;
		}
		if (len > 0) memcpy(copy, buf, len);
		copy[len] = '\0';
		free(buf);
		*out = copy;
		*out_len = len;
		return ALL_OK;
	}
	if (reply->blob) {
		char *copy = malloc(reply->blob_len + 1);
		if (!copy) return ERR_SYSTEM_FAILURE;
		if (reply->blob_len > 0) memcpy(copy, reply->blob, reply->blob_len);
		copy[reply->blob_len] = '\0';
		*out = copy;
		*out_len = reply->blob_len;
		return ALL_OK;
	}
	size_t len = reply->payload_len;
	char *copy = malloc(len + 1);
	if (!copy) return ERR_SYSTEM_FAILURE;
	if (len > 0) memcpy(copy, reply->payload, len);
	copy[len] = '\0';
	*out = copy;
	*out_len = len;
	return ALL_OK;
}

static ErrorCode fetch_file_from_storage(const StorageServerSnapshot *ss,
								          const char *username,
								          const char *filename,
								          char **out_content,
								          size_t *out_len) {
	if (!ss || !out_content || !out_len) return ERR_SYSTEM_FAILURE;
	*out_content = NULL;
	*out_len = 0;
	int ss_sockfd = clientinit(ss->ip, ss->client_port);
	if (ss_sockfd < 0) {
		return ERR_CONN_FAILED;
	}
	const char *user = (username && username[0]) ? username : "";
	if (sendmessage(ss_sockfd, READ, ALL_OK, (char*)user, (char*)filename, NULL) < 0) {
		destroysocket(ss_sockfd);
		return ERR_CONN_FAILED;
	}
	Message reply;
	if (recvmessage(ss_sockfd, &reply) < 0) {
		destroysocket(ss_sockfd);
		return ERR_CONN_FAILED;
	}
	if (reply.err != ALL_OK) {
		ErrorCode err = reply.err;
		if (reply.blob) free(reply.blob);
		destroysocket(ss_sockfd);
		return err;
	}
	ErrorCode rc = collect_message_content(ss_sockfd, &reply, out_content, out_len);
	if (reply.blob) free(reply.blob);
	destroysocket(ss_sockfd);
	return rc;
}

static int decode_exec_newlines(const char *script,
			      size_t script_len,
			      char **out_buf,
			      size_t *out_len) {
	if (!out_buf || !out_len) return -1;
	*out_buf = NULL;
	*out_len = 0;
	size_t alloc_len = script_len + 1;
	char *buf = malloc(alloc_len > 0 ? alloc_len : 1);
	if (!buf) return -1;
	size_t write_idx = 0;
	size_t i = 0;
	while (i < script_len) {
		unsigned char ch = (unsigned char)script[i];
		if (ch == '\\') {
			size_t j = i;
			while (j < script_len && script[j] == '\\') j++;
			size_t run = j - i;
			if (j < script_len && script[j] == 'n' && (run % 2 == 1)) {
				size_t literal_slashes = run / 2;
				for (size_t k = 0; k < literal_slashes; ++k) {
					buf[write_idx++] = '\\';
				}
				buf[write_idx++] = '\n';
				i = j + 1;
				continue;
			}
			for (size_t k = 0; k < run; ++k) {
				buf[write_idx++] = '\\';
			}
			i = j;
			continue;
		}
		buf[write_idx++] = (char)ch;
		i++;
	}
	buf[write_idx] = '\0';
	*out_buf = buf;
	*out_len = write_idx;
	return 0;
}

static ErrorCode execute_script_content(const char *script,
					       size_t script_len,
					       char **output,
					       size_t *output_len) {
	if (!output || !output_len) return ERR_SYSTEM_FAILURE;
	if (!script) {
		script = "";
		script_len = 0;
	}
	char *decoded = NULL;
	size_t decoded_len = 0;
	if (decode_exec_newlines(script, script_len, &decoded, &decoded_len) != 0) {
		return ERR_SYSTEM_FAILURE;
	}
	char template[] = "/tmp/nmexecXXXXXX";
	int fd = mkstemp(template);
	if (fd < 0) {
		free(decoded);
		return ERR_SYSTEM_FAILURE;
	}
	size_t written = 0;
	while (written < decoded_len) {
		ssize_t w = write(fd, decoded + written, decoded_len - written);
		if (w < 0) {
			int saved = errno;
			close(fd);
			unlink(template);
			free(decoded);
			errno = saved;
			return ERR_SYSTEM_FAILURE;
		}
		written += (size_t)w;
	}
	close(fd);
	FILE *pipe = NULL;
	char cmd[160];
	snprintf(cmd, sizeof(cmd), "sh %s 2>&1", template);
	pipe = popen(cmd, "r");
	if (!pipe) {
		unlink(template);
		free(decoded);
		return ERR_SYSTEM_FAILURE;
	}
	char *buffer = NULL;
	size_t cap = 0;
	size_t len = 0;
	int append_error = 0;
	char chunk[1024];
	while (!feof(pipe)) {
		size_t r = fread(chunk, 1, sizeof(chunk), pipe);
		if (r > 0) {
			if (append_bytes(&buffer, &cap, &len, chunk, r) != 0) {
				append_error = 1;
				break;
			}
		}
		if (ferror(pipe)) {
			append_error = 1;
			break;
		}
	}
	int status = pclose(pipe);
	unlink(template);
	free(decoded);
	if (append_error || status == -1) {
		free(buffer);
		return ERR_SYSTEM_FAILURE;
	}
	if (!buffer) {
		buffer = calloc(1, 1);
		if (!buffer) return ERR_SYSTEM_FAILURE;
	}
	char extra[128];
	extra[0] = '\0';
	if (WIFEXITED(status)) {
		int exit_code = WEXITSTATUS(status);
		if (exit_code != 0) {
			snprintf(extra, sizeof(extra), "\n[exit status %d]\n", exit_code);
		}
	} else if (WIFSIGNALED(status)) {
		int sig = WTERMSIG(status);
		snprintf(extra, sizeof(extra), "\n[terminated by signal %d]\n", sig);
	}
	if (extra[0]) {
		if (append_bytes(&buffer, &cap, &len, extra, strlen(extra)) != 0) {
			free(buffer);
			return ERR_SYSTEM_FAILURE;
		}
	}
	*output = buffer;
	*output_len = len;
	return ALL_OK;
}

static int send_exec_output_response(int sockfd, const Message *msg, const char *output, size_t output_len) {
	if (!output) {
		output = "";
		output_len = 0;
	}
	if (output_len <= PAYLOAD_SIZE && !memchr(output, '\0', output_len)) {
		char *tmp = malloc(output_len + 1);
		if (!tmp) return -1;
		if (output_len > 0) memcpy(tmp, output, output_len);
		tmp[output_len] = '\0';
		int rc = sendmessage(sockfd, EXEC, ALL_OK, (char*)msg->username, (char*)msg->filename, tmp);
		free(tmp);
		return rc;
	}
	char header[64];
	snprintf(header, sizeof(header), "BLOB %zu", output_len);
	if (sendmessage(sockfd, EXEC, ALL_OK, (char*)msg->username, (char*)msg->filename, header) < 0) {
		return -1;
	}
	if (send_blob(sockfd, output, output_len) < 0) {
		return -1;
	}
	return 0;
}

static void handle_view_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	ViewOptions opts;
	parse_view_flags(msg, &opts);

	FileMetadataSnapshot *files = NULL;
	size_t file_count = 0;
	if (metadata_list_files(&files, &file_count) < 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, msg->username, VIEW, ERR_SYSTEM_FAILURE, "metadata_list_files failed");
		sendmessage(sockfd, VIEW, ERR_SYSTEM_FAILURE, NULL, NULL, "VIEW_FAILED");
		return;
	}

	size_t matched = 0;
	char *buffer = NULL;
	size_t cap = 0, len = 0;
	int long_fmt = opts.long_format;
	int header_written = 0;

	for (size_t i = 0; i < file_count; ++i) {
		FileMetadataSnapshot *f = &files[i];
		if (!f->user_visible) {
			continue;
		}
		if (!opts.include_all && !user_has_read_access(f, msg->username)) {
			continue;
		}
		matched++;
		if (long_fmt) {
			if (!header_written) {
				append_text(&buffer, &cap, &len, "-----------------------------------------------------------------\n");
				append_text(&buffer, &cap, &len, "|  Filename  | Words | Chars | Last Access Time | Owner         |\n");
				append_text(&buffer, &cap, &len, "|------------|-------|-------|------------------|---------------|\n");
				header_written = 1;
			}
			char ts[32];
			format_time_string(f->last_access, ts, sizeof(ts));
			char line[256];
			snprintf(line, sizeof(line), "| %-10s | %5zu | %5zu | %-16s | %-13s |\n",
			         f->filename, f->word_count, f->char_count, ts, f->owner);
			append_text(&buffer, &cap, &len, line);
		} else {
			char line[160];
			snprintf(line, sizeof(line), "--> %s\n", f->filename);
			append_text(&buffer, &cap, &len, line);
		}
	}

	if (matched == 0) {
		append_text(&buffer, &cap, &len, "No files found for this query.\n");
	} else if (long_fmt && header_written) {
		append_text(&buffer, &cap, &len, "-----------------------------------------------------------------\n");
	}

	// Fallback if allocation failed
	const char *response = buffer ? buffer : "No files found for this query.\n";
	if (sendmessage(sockfd, VIEW, ALL_OK, NULL, NULL, (char*)response) < 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, msg->username, VIEW, ERR_CONN_FAILED, "sendmessage failed for VIEW");
	}

	char detail[128];
	snprintf(detail, sizeof(detail), "VIEW flags=%s%s returned=%zu",
	         opts.include_all ? "a" : "",
	         opts.long_format ? "l" : "",
	         matched);
	log_response("NM", peer_ip, peer_port, msg->username, VIEW, ALL_OK, detail);

	metadata_free_file_list(files);
	free(buffer);
}

static void handle_list_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	UserSnapshot *users = NULL;
	size_t count = 0;
	if (metadata_list_users(&users, &count) < 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, msg->username, LIST, ERR_SYSTEM_FAILURE, "metadata_list_users failed");
		sendmessage(sockfd, LIST, ERR_SYSTEM_FAILURE, NULL, NULL, "LIST_FAILED");
		return;
	}

	char *buffer = NULL;
	size_t cap = 0, len = 0;
	if (count == 0) {
		append_text(&buffer, &cap, &len, "No users registered yet.\n");
	} else {
		for (size_t i = 0; i < count; ++i) {
			char line[UNAME_LENGTH + 8];
			snprintf(line, sizeof(line), "--> %s\n", users[i].username);
			append_text(&buffer, &cap, &len, line);
		}
	}

	const char *response = buffer ? buffer : "No users registered yet.\n";
	if (sendmessage(sockfd, LIST, ALL_OK, NULL, NULL, (char*)response) < 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, msg->username, LIST, ERR_CONN_FAILED, "sendmessage failed for LIST");
	}
	log_response("NM", peer_ip, peer_port, msg->username, LIST, ALL_OK, "LIST completed");
	metadata_free_user_list(users);
	free(buffer);
}

static void handle_create_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	filename[0] = '\0';
	if (msg->filename[0]) {
		strncpy(filename, msg->filename, sizeof(filename) - 1);
		filename[sizeof(filename) - 1] = '\0';
	} else if (msg->payload_len > 0) {
		size_t len = msg->payload_len;
		if (len >= sizeof(filename)) len = sizeof(filename) - 1;
		memcpy(filename, msg->payload, len);
		filename[len] = '\0';
	}
	trim_spaces(filename);
	if (filename[0] == '\0') {
		sendmessage(sockfd, CREATE, ERR_INVALID_ARG, (char*)msg->username, NULL, "CREATE requires a filename");
		return;
	}

	FileMetadataSnapshot dummy;
	if (metadata_lookup_file(filename, &dummy, NULL) == 0) {
		sendmessage(sockfd, CREATE, ERR_FILE_EXISTS, (char*)msg->username, filename, "File already exists");
		return;
	}

	StorageServerSnapshot target = {0};
	Message ss_reply = {0};
	const char *owner = (msg->username[0]) ? msg->username : "system";
	while (1) {
		if (metadata_pick_storage_server(&target) != 0) {
			sendmessage(sockfd, CREATE, ERR_SERVER_DOWN, (char*)msg->username, filename, "No storage server available");
			return;
		}

		int ss_sockfd = clientinit(target.ip, target.client_port);
		if (ss_sockfd < 0) {
			metadata_mark_storage_server_down(target.ss_id);
			char warn[256];
			snprintf(warn, sizeof(warn), "SS %s at %s:%d unreachable (connect)",
			         target.ss_id[0] ? target.ss_id : "(unknown)",
			         target.ip[0] ? target.ip : "(unknown)",
			         target.client_port);
			log_event("NM", "WARN", peer_ip, peer_port, msg->username, CREATE, ERR_CONN_FAILED, warn);
			continue;
		}

		if (sendmessage(ss_sockfd, CREATE, ALL_OK, (char*)owner, filename, NULL) < 0) {
			metadata_mark_storage_server_down(target.ss_id);
			destroysocket(ss_sockfd);
			char warn[256];
			snprintf(warn, sizeof(warn), "SS %s at %s:%d unreachable (send)",
			         target.ss_id[0] ? target.ss_id : "(unknown)",
			         target.ip[0] ? target.ip : "(unknown)",
			         target.client_port);
			log_event("NM", "WARN", peer_ip, peer_port, msg->username, CREATE, ERR_CONN_FAILED, warn);
			continue;
		}

		if (recvmessage(ss_sockfd, &ss_reply) < 0) {
			metadata_mark_storage_server_down(target.ss_id);
			destroysocket(ss_sockfd);
			char warn[256];
			snprintf(warn, sizeof(warn), "SS %s at %s:%d unreachable (recv)",
			         target.ss_id[0] ? target.ss_id : "(unknown)",
			         target.ip[0] ? target.ip : "(unknown)",
			         target.client_port);
			log_event("NM", "WARN", peer_ip, peer_port, msg->username, CREATE, ERR_CONN_FAILED, warn);
			continue;
		}
		destroysocket(ss_sockfd);
		break;
	}

	char detail_buf[PAYLOAD_SIZE + 1];
	const char *ss_detail = NULL;
	if (ss_reply.payload_len > 0) {
		size_t copy_len = ss_reply.payload_len;
		if (copy_len >= sizeof(detail_buf)) copy_len = sizeof(detail_buf) - 1;
		memcpy(detail_buf, ss_reply.payload, copy_len);
		detail_buf[copy_len] = '\0';
		ss_detail = detail_buf;
	} else {
		ss_detail = (ss_reply.err == ALL_OK) ? "FILE_CREATED" : geterror(ss_reply.err);
	}

	if (ss_reply.err != ALL_OK) {
		sendmessage(sockfd, CREATE, ss_reply.err, (char*)msg->username, filename, (char*)ss_detail);
		if (ss_reply.blob) free(ss_reply.blob);
		return;
	}

	if (ss_reply.blob) free(ss_reply.blob);

	int rc = metadata_create_file_record(filename,
	                                   owner,
	                                   ACL_DEFAULT_FLAGS,
	                                   target.ss_id,
	                                   0,
	                                   0,
	                                   time(NULL));
	if (rc == METADATA_ERR_EXISTS) {
		sendmessage(sockfd, CREATE, ERR_FILE_EXISTS, (char*)msg->username, filename, "File already exists");
		return;
	} else if (rc != 0) {
		sendmessage(sockfd, CREATE, ERR_SYSTEM_FAILURE, (char*)msg->username, filename, "Failed to update metadata");
		return;
	}

	log_response("NM", peer_ip, peer_port, msg->username, CREATE, ALL_OK, "File created");
	sendmessage(sockfd, CREATE, ALL_OK, (char*)msg->username, filename, (char*)ss_detail);
}

static void handle_delete_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, DELETE, ERR_INVALID_ARG, (char*)msg->username, NULL, "DELETE requires filename");
		return;
	}
	if (!msg->username[0]) {
		sendmessage(sockfd, DELETE, ERR_UNAUTHORISED, NULL, filename, "Username required");
		return;
	}
	FileMetadataSnapshot file_snap;
	StorageServerSnapshot ss_snap;
	if (metadata_lookup_file(filename, &file_snap, &ss_snap) != 0) {
		sendmessage(sockfd, DELETE, ERR_FILE_NOT_FOUND, (char*)msg->username, filename, "File not found");
		return;
	}
	if (file_snap.active_writers > 0) {
		sendmessage(sockfd, DELETE, ERR_SENT_LOCKED, (char*)msg->username, filename, "File is currently being written");
		return;
	}
	if (strncmp(file_snap.owner, msg->username, UNAME_LENGTH) != 0) {
		sendmessage(sockfd, DELETE, ERR_NOT_OWNER, (char*)msg->username, filename, "Only owner can delete file");
		return;
	}
	if (ss_snap.client_port == 0 || ss_snap.ip[0] == '\0') {
		sendmessage(sockfd, DELETE, ERR_SERVER_DOWN, (char*)msg->username, filename, "Storage server unavailable");
		return;
	}
	int ss_sockfd = clientinit(ss_snap.ip, ss_snap.client_port);
	if (ss_sockfd < 0) {
		sendmessage(sockfd, DELETE, ERR_CONN_FAILED, (char*)msg->username, filename, "Failed to reach storage server");
		return;
	}
	if (sendmessage(ss_sockfd, DELETE, ALL_OK, (char*)msg->username, filename, NULL) < 0) {
		destroysocket(ss_sockfd);
		sendmessage(sockfd, DELETE, ERR_CONN_FAILED, (char*)msg->username, filename, "Failed to send delete command");
		return;
	}
	Message ss_reply;
	if (recvmessage(ss_sockfd, &ss_reply) < 0) {
		destroysocket(ss_sockfd);
		sendmessage(sockfd, DELETE, ERR_CONN_FAILED, (char*)msg->username, filename, "No response from storage server");
		return;
	}
	destroysocket(ss_sockfd);
	if (ss_reply.err != ALL_OK) {
		char detail_buf[PAYLOAD_SIZE + 1];
		const char *detail = geterror(ss_reply.err);
		if (ss_reply.payload_len > 0) {
			size_t copy_len = ss_reply.payload_len;
			if (copy_len >= sizeof(detail_buf)) copy_len = sizeof(detail_buf) - 1;
			memcpy(detail_buf, ss_reply.payload, copy_len);
			detail_buf[copy_len] = '\0';
			detail = detail_buf;
		}
		sendmessage(sockfd, DELETE, ss_reply.err, (char*)msg->username, filename, (char*)detail);
		if (ss_reply.blob) free(ss_reply.blob);
		return;
	}
	if (ss_reply.blob) free(ss_reply.blob);
	int md_rc = metadata_delete_file(filename);
	if (md_rc != 0) {
		ErrorCode derr = (md_rc == ERR_SENT_LOCKED) ? ERR_SENT_LOCKED : ERR_SYSTEM_FAILURE;
		const char *detail = (derr == ERR_SENT_LOCKED) ? "File is currently being written" : "Failed to update metadata";
		sendmessage(sockfd, DELETE, derr, (char*)msg->username, filename, (char*)detail);
		return;
	}
	char detail[160];
	snprintf(detail, sizeof(detail), "File '%s' deleted successfully!", filename);
	sendmessage(sockfd, DELETE, ALL_OK, (char*)msg->username, filename, detail);
	log_response("NM", peer_ip, peer_port, msg->username, DELETE, ALL_OK, detail);
}

static void handle_info_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, INFO, ERR_INVALID_ARG, (char*)msg->username, NULL, "INFO requires filename");
		return;
	}
	FileMetadataSnapshot snap;
	char *acl_desc = NULL;
	int rc = metadata_get_file_details(filename, &snap, &acl_desc);
	if (rc != 0) {
		sendmessage(sockfd, INFO, (ErrorCode)rc, (char*)msg->username, filename, "File not found");
		if (acl_desc) free(acl_desc);
		return;
	}
	char created_buf[32];
	char modified_buf[32];
	char accessed_buf[64];
	format_time_string(snap.ctime, created_buf, sizeof(created_buf));
	format_time_string(snap.mtime, modified_buf, sizeof(modified_buf));
	format_time_string(snap.last_access, accessed_buf, sizeof(accessed_buf));
	char access_line[PAYLOAD_SIZE];
	const char *acl_text = (acl_desc && acl_desc[0]) ? acl_desc : "(owner only)";
	snprintf(access_line, sizeof(access_line),
	        "--> File: %s\n--> Owner: %s\n--> Created: %s\n--> Last Modified: %s\n--> Size: %zu bytes\n--> Access: %s\n--> Last Accessed: %s by %s\n",
	        snap.filename,
	        snap.owner[0] ? snap.owner : "(unknown)",
	        created_buf,
	        modified_buf,
	        snap.char_count,
	        acl_text,
	        accessed_buf,
	        snap.last_access_user[0] ? snap.last_access_user : "(unknown)");
	if (sendmessage(sockfd, INFO, ALL_OK, (char*)msg->username, filename, access_line) < 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, msg->username, INFO, ERR_CONN_FAILED, "Failed to send INFO response");
	}
	log_response("NM", peer_ip, peer_port, msg->username, INFO, ALL_OK, "INFO returned metadata");
	if (acl_desc) free(acl_desc);
}

static void handle_addaccess_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, ADDACCESS, ERR_INVALID_ARG, (char*)msg->username, NULL, "ADDACCESS requires filename");
		return;
	}
	if (msg->payload_len == 0) {
		sendmessage(sockfd, ADDACCESS, ERR_INVALID_ARG, (char*)msg->username, filename, "ADDACCESS requires mode and username");
		return;
	}
	char payload_copy[PAYLOAD_SIZE + 1];
	size_t copy_len = msg->payload_len;
	if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
	memcpy(payload_copy, msg->payload, copy_len);
	payload_copy[copy_len] = '\0';
	char *saveptr = NULL;
	char *mode_tok = strtok_r(payload_copy, " \t", &saveptr);
	char *user_tok = strtok_r(NULL, " \t", &saveptr);
	if (!mode_tok || !user_tok) {
		sendmessage(sockfd, ADDACCESS, ERR_INVALID_ARG, (char*)msg->username, filename, "Invalid ADDACCESS format");
		return;
	}
	trim_spaces(user_tok);
	int grant_write = 0;
	char mode_char = mode_tok[0];
	if (mode_char == '-') {
		mode_char = mode_tok[1];
	}
	mode_char = toupper((unsigned char)mode_char);
	if (mode_char == 'W') {
		grant_write = 1;
	} else if (mode_char != 'R') {
		sendmessage(sockfd, ADDACCESS, ERR_INVALID_ARG, (char*)msg->username, filename, "Mode must be -R or -W");
		return;
	}
	int rc = metadata_grant_access(filename, msg->username, user_tok, grant_write);
	if (rc != ALL_OK) {
		const char *detail = "ACCESS_UPDATE_FAILED";
		if (rc == ERR_NOT_OWNER) detail = "Only owner can change access";
		else if (rc == ERR_USER_NOT_FOUND) detail = "User not found";
		else if (rc == ERR_FILE_NOT_FOUND) detail = "File not found";
		else if (rc == ERR_INVALID_ARG) detail = "Invalid arguments";
		sendmessage(sockfd, ADDACCESS, (ErrorCode)rc, (char*)msg->username, filename, (char*)detail);
		return;
	}
	char detail[256];
	snprintf(detail, sizeof(detail), "Granted %s access to %s", grant_write ? "read/write" : "read", user_tok);
	sendmessage(sockfd, ADDACCESS, ALL_OK, (char*)msg->username, filename, detail);
	log_response("NM", peer_ip, peer_port, msg->username, ADDACCESS, ALL_OK, detail);
}

static void handle_remaccess_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, REMACCESS, ERR_INVALID_ARG, (char*)msg->username, NULL, "REMACCESS requires filename");
		return;
	}
	if (msg->payload_len == 0) {
		sendmessage(sockfd, REMACCESS, ERR_INVALID_ARG, (char*)msg->username, filename, "REMACCESS requires username");
		return;
	}
	char user_buf[UNAME_LENGTH];
	size_t copy_len = msg->payload_len;
	if (copy_len >= sizeof(user_buf)) copy_len = sizeof(user_buf) - 1;
	memcpy(user_buf, msg->payload, copy_len);
	user_buf[copy_len] = '\0';
	trim_spaces(user_buf);
	if (user_buf[0] == '\0') {
		sendmessage(sockfd, REMACCESS, ERR_INVALID_ARG, (char*)msg->username, filename, "Username required");
		return;
	}
	int rc = metadata_remove_access(filename, msg->username, user_buf);
	if (rc != ALL_OK) {
		const char *detail = "ACCESS_REMOVE_FAILED";
		if (rc == ERR_NOT_OWNER) detail = "Only owner can change access";
		else if (rc == ERR_USER_NOT_FOUND) detail = "User not found";
		else if (rc == ERR_FILE_NOT_FOUND) detail = "File not found";
		else if (rc == ERR_INVALID_ARG) detail = "Cannot remove owner access";
		sendmessage(sockfd, REMACCESS, (ErrorCode)rc, (char*)msg->username, filename, (char*)detail);
		return;
	}
	char detail[256];
	snprintf(detail, sizeof(detail), "Removed access for %s", user_buf);
	sendmessage(sockfd, REMACCESS, ALL_OK, (char*)msg->username, filename, detail);
	log_response("NM", peer_ip, peer_port, msg->username, REMACCESS, ALL_OK, detail);
}

static void handle_read_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, READ, ERR_INVALID_ARG, (char*)msg->username, NULL, "READ requires filename");
		return;
	}
	char payload_copy[PAYLOAD_SIZE + 1] = {0};
	char *cmd = NULL;
	char *saveptr = NULL;
	if (msg->payload_len > 0) {
		size_t copy_len = msg->payload_len;
		if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
		memcpy(payload_copy, msg->payload, copy_len);
		payload_copy[copy_len] = '\0';
		cmd = strtok_r(payload_copy, " \t\r\n", &saveptr);
	}
	if (cmd && strcasecmp(cmd, "COMPLETE") == 0) {
		char *status_tok = strtok_r(NULL, " \t\r\n", &saveptr);
		long status_val = ERR_SYSTEM_FAILURE;
		if (status_tok) {
			char *endptr = NULL;
			status_val = strtol(status_tok, &endptr, 10);
			if (status_tok == endptr) status_val = ERR_SYSTEM_FAILURE;
		}
		if (status_val == ALL_OK) {
			if (metadata_record_access(filename, msg->username, 0) != 0) {
				sendmessage(sockfd, READ, ERR_SYSTEM_FAILURE, (char*)msg->username, filename, "Failed to update metadata");
				return;
			}
		}
		char detail[128];
		snprintf(detail, sizeof(detail), "READ complete (status=%ld)", status_val);
		sendmessage(sockfd, READ, ALL_OK, (char*)msg->username, filename, detail);
		log_response("NM", peer_ip, peer_port, msg->username, READ, ALL_OK, detail);
		return;
	}
	FileMetadataSnapshot file_snap;
	StorageServerSnapshot ss_snap;
	if (metadata_lookup_file(filename, &file_snap, &ss_snap) != 0) {
		sendmessage(sockfd, READ, ERR_FILE_NOT_FOUND, (char*)msg->username, filename, "File not found");
		return;
	}
	ErrorCode access = ensure_access_from_snapshot(&file_snap, msg->username, 0);
	if (access != ALL_OK) {
		const char *detail = (access == ERR_FILE_NOT_FOUND) ? "File not found" : "Access denied";
		sendmessage(sockfd, READ, access, (char*)msg->username, filename, (char*)detail);
		return;
	}
	if (ss_snap.client_port == 0 || ss_snap.ip[0] == '\0') {
		sendmessage(sockfd, READ, ERR_SERVER_DOWN, (char*)msg->username, filename, "Storage server unavailable");
		return;
	}
	char response[PAYLOAD_SIZE];
	snprintf(response, sizeof(response), "SS %s %d", ss_snap.ip, ss_snap.client_port);
	sendmessage(sockfd, READ, ALL_OK, (char*)msg->username, filename, response);
	log_response("NM", peer_ip, peer_port, msg->username, READ, ALL_OK, "READ routing info returned");
}

static void handle_stream_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, STREAM, ERR_INVALID_ARG, (char*)msg->username, NULL, "STREAM requires filename");
		return;
	}
	char payload_copy[PAYLOAD_SIZE + 1] = {0};
	char *cmd = NULL;
	char *saveptr = NULL;
	if (msg->payload_len > 0) {
		size_t copy_len = msg->payload_len;
		if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
		memcpy(payload_copy, msg->payload, copy_len);
		payload_copy[copy_len] = '\0';
		cmd = strtok_r(payload_copy, " \t\r\n", &saveptr);
	}
	if (cmd && strcasecmp(cmd, "COMPLETE") == 0) {
		char *status_tok = strtok_r(NULL, " \t\r\n", &saveptr);
		long status_val = ERR_SYSTEM_FAILURE;
		if (status_tok) {
			char *endptr = NULL;
			status_val = strtol(status_tok, &endptr, 10);
			if (status_tok == endptr) status_val = ERR_SYSTEM_FAILURE;
		}
		if (status_val == ALL_OK) {
			if (metadata_record_access(filename, msg->username, 0) != 0) {
				sendmessage(sockfd, STREAM, ERR_SYSTEM_FAILURE, (char*)msg->username, filename, "Failed to update metadata");
				return;
			}
		}
		char detail[128];
		snprintf(detail, sizeof(detail), "STREAM complete (status=%ld)", status_val);
		sendmessage(sockfd, STREAM, ALL_OK, (char*)msg->username, filename, detail);
		log_response("NM", peer_ip, peer_port, msg->username, STREAM, ALL_OK, detail);
		return;
	}
	FileMetadataSnapshot file_snap;
	StorageServerSnapshot ss_snap;
	if (metadata_lookup_file(filename, &file_snap, &ss_snap) != 0) {
		sendmessage(sockfd, STREAM, ERR_FILE_NOT_FOUND, (char*)msg->username, filename, "File not found");
		return;
	}
	ErrorCode access = ensure_access_from_snapshot(&file_snap, msg->username, 0);
	if (access != ALL_OK) {
		const char *detail = (access == ERR_FILE_NOT_FOUND) ? "File not found" : "Access denied";
		sendmessage(sockfd, STREAM, access, (char*)msg->username, filename, (char*)detail);
		return;
	}
	if (ss_snap.client_port == 0 || ss_snap.ip[0] == '\0') {
		sendmessage(sockfd, STREAM, ERR_SERVER_DOWN, (char*)msg->username, filename, "Storage server unavailable");
		return;
	}
	char response[PAYLOAD_SIZE];
	snprintf(response, sizeof(response), "SS %s %d", ss_snap.ip, ss_snap.client_port);
	sendmessage(sockfd, STREAM, ALL_OK, (char*)msg->username, filename, response);
	log_response("NM", peer_ip, peer_port, msg->username, STREAM, ALL_OK, "STREAM routing info returned");
}

static void handle_undo_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, UNDO, ERR_INVALID_ARG, (char*)msg->username, NULL, "UNDO requires filename");
		return;
	}
	FileMetadataSnapshot file_snap;
	StorageServerSnapshot ss_snap;
	if (metadata_lookup_file(filename, &file_snap, &ss_snap) != 0) {
		sendmessage(sockfd, UNDO, ERR_FILE_NOT_FOUND, (char*)msg->username, filename, "File not found");
		return;
	}
	ErrorCode access = ensure_access_from_snapshot(&file_snap, msg->username, 1);
	if (access != ALL_OK) {
		const char *detail = (access == ERR_FILE_NOT_FOUND) ? "File not found" : "Write access required";
		sendmessage(sockfd, UNDO, access, (char*)msg->username, filename, (char*)detail);
		return;
	}
	if (!metadata_can_undo(filename)) {
		sendmessage(sockfd, UNDO, ERR_NOTHING_TO_UNDO, (char*)msg->username, filename, "No undo available");
		return;
	}
	if (ss_snap.client_port == 0 || ss_snap.ip[0] == '\0') {
		sendmessage(sockfd, UNDO, ERR_SERVER_DOWN, (char*)msg->username, filename, "Storage server unavailable");
		return;
	}
	int ss_sockfd = clientinit(ss_snap.ip, ss_snap.client_port);
	if (ss_sockfd < 0) {
		sendmessage(sockfd, UNDO, ERR_CONN_FAILED, (char*)msg->username, filename, "Failed to reach storage server");
		return;
	}
	if (sendmessage(ss_sockfd, UNDO, ALL_OK, (char*)msg->username, filename, NULL) < 0) {
		destroysocket(ss_sockfd);
		sendmessage(sockfd, UNDO, ERR_CONN_FAILED, (char*)msg->username, filename, "Failed to send UNDO to storage server");
		return;
	}
	Message ss_reply;
	if (recvmessage(ss_sockfd, &ss_reply) < 0) {
		destroysocket(ss_sockfd);
		sendmessage(sockfd, UNDO, ERR_CONN_FAILED, (char*)msg->username, filename, "No response from storage server");
		return;
	}
	destroysocket(ss_sockfd);
	if (ss_reply.err != ALL_OK) {
		const char *detail = NULL;
		if (ss_reply.payload_len > 0) {
			char buf[PAYLOAD_SIZE + 1];
			size_t len = ss_reply.payload_len;
			if (len > PAYLOAD_SIZE) len = PAYLOAD_SIZE;
			memcpy(buf, ss_reply.payload, len);
			buf[len] = '\0';
			detail = buf;
		} else {
			detail = geterror(ss_reply.err);
		}
		sendmessage(sockfd, UNDO, ss_reply.err, (char*)msg->username, filename, (char*)(detail ? detail : "UNDO failed"));
		if (ss_reply.blob) free(ss_reply.blob);
		return;
	}
	if (ss_reply.blob) free(ss_reply.blob);
	int meta_rc = metadata_apply_undo(filename);
	if (meta_rc != 0) {
		ErrorCode err = (meta_rc == ERR_FILE_NOT_FOUND) ? ERR_FILE_NOT_FOUND :
		               (meta_rc == ERR_NOTHING_TO_UNDO) ? ERR_NOTHING_TO_UNDO : ERR_SYSTEM_FAILURE;
		sendmessage(sockfd, UNDO, err, (char*)msg->username, filename, "Failed to update metadata");
		return;
	}
	const char *detail = (ss_reply.payload_len > 0) ? ss_reply.payload : "Undo successful";
	sendmessage(sockfd, UNDO, ALL_OK, (char*)msg->username, filename, (char*)detail);
	log_response("NM", peer_ip, peer_port, msg->username, UNDO, ALL_OK, detail);
}

static void handle_exec_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, EXEC, ERR_INVALID_ARG, (char*)msg->username, NULL, "EXEC requires filename");
		return;
	}
	FileMetadataSnapshot file_snap;
	StorageServerSnapshot ss_snap;
	if (metadata_lookup_file(filename, &file_snap, &ss_snap) != 0) {
		sendmessage(sockfd, EXEC, ERR_FILE_NOT_FOUND, (char*)msg->username, filename, "File not found");
		return;
	}
	ErrorCode access = ensure_access_from_snapshot(&file_snap, msg->username, 0);
	if (access != ALL_OK) {
		const char *detail = (access == ERR_FILE_NOT_FOUND) ? "File not found" : "Access denied";
		sendmessage(sockfd, EXEC, access, (char*)msg->username, filename, (char*)detail);
		return;
	}
	if (ss_snap.client_port == 0 || ss_snap.ip[0] == '\0') {
		sendmessage(sockfd, EXEC, ERR_SERVER_DOWN, (char*)msg->username, filename, "Storage server unavailable");
		return;
	}
	char *script = NULL;
	size_t script_len = 0;
	ErrorCode fetch_err = fetch_file_from_storage(&ss_snap, msg->username, filename, &script, &script_len);
	if (fetch_err != ALL_OK) {
		const char *detail = (fetch_err == ERR_FILE_NOT_FOUND) ? "File not found on storage" : geterror(fetch_err);
		sendmessage(sockfd, EXEC, fetch_err, (char*)msg->username, filename, (char*)detail);
		return;
	}
	char *output = NULL;
	size_t output_len = 0;
	ErrorCode exec_err = execute_script_content(script, script_len, &output, &output_len);
	free(script);
	if (exec_err != ALL_OK) {
		free(output);
		sendmessage(sockfd, EXEC, exec_err, (char*)msg->username, filename, "Execution failed");
		return;
	}
	if (metadata_record_access(filename, msg->username, 0) != 0) {
		free(output);
		sendmessage(sockfd, EXEC, ERR_SYSTEM_FAILURE, (char*)msg->username, filename, "Failed to update access log");
		return;
	}
	if (send_exec_output_response(sockfd, msg, output, output_len) < 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, msg->username, EXEC, ERR_CONN_FAILED, "Failed to send EXEC output");
		free(output);
		return;
	}
	char detail[160];
	snprintf(detail, sizeof(detail), "EXEC completed (%zu bytes)", output_len);
	log_response("NM", peer_ip, peer_port, msg->username, EXEC, ALL_OK, detail);
	free(output);
}

static void handle_write_request(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	char filename[FNAME_LENGTH];
	if (extract_filename_from_msg(msg, filename, sizeof(filename)) != 0) {
		sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)msg->username, NULL, "WRITE requires filename");
		return;
	}
	char payload_copy[PAYLOAD_SIZE + 1] = {0};
	char *cmd = NULL;
	char *saveptr = NULL;
	if (msg->payload_len > 0) {
		size_t copy_len = msg->payload_len;
		if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
		memcpy(payload_copy, msg->payload, copy_len);
		payload_copy[copy_len] = '\0';
		cmd = strtok_r(payload_copy, " \t\r\n", &saveptr);
	}
	if (!cmd || strcasecmp(cmd, "START") == 0 || isdigit((unsigned char)cmd[0])) {
		const char *idx_tok = NULL;
		if (!cmd) {
			sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)msg->username, filename, "WRITE requires sentence index");
			return;
		}
		if (strcasecmp(cmd, "START") == 0) {
			idx_tok = strtok_r(NULL, " \t\r\n", &saveptr);
		} else {
			idx_tok = cmd;
		}
		if (!idx_tok) {
			sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)msg->username, filename, "Missing sentence index");
			return;
		}
		char *endptr = NULL;
		long sentence_idx = strtol(idx_tok, &endptr, 10);
		if (idx_tok == endptr || sentence_idx < 0) {
			sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)msg->username, filename, "Invalid sentence index");
			return;
		}
		FileMetadataSnapshot file_snap;
		StorageServerSnapshot ss_snap;
		if (metadata_lookup_file(filename, &file_snap, &ss_snap) != 0) {
			sendmessage(sockfd, WRITE, ERR_FILE_NOT_FOUND, (char*)msg->username, filename, "File not found");
			return;
		}
		ErrorCode access = ensure_access_from_snapshot(&file_snap, msg->username, 1);
		if (access != ALL_OK) {
			const char *detail = (access == ERR_FILE_NOT_FOUND) ? "File not found" : "Write access denied";
			sendmessage(sockfd, WRITE, access, (char*)msg->username, filename, (char*)detail);
			return;
		}
		if (ss_snap.client_port == 0 || ss_snap.ip[0] == '\0') {
			sendmessage(sockfd, WRITE, ERR_SERVER_DOWN, (char*)msg->username, filename, "Storage server unavailable");
			return;
		}
		int rc = metadata_begin_write_session(filename, msg->username);
		if (rc != 0) {
			ErrorCode err = (rc == ERR_FILE_NOT_FOUND) ? ERR_FILE_NOT_FOUND : ERR_SYSTEM_FAILURE;
			sendmessage(sockfd, WRITE, err, (char*)msg->username, filename, "Failed to register write session");
			return;
		}
		char response[PAYLOAD_SIZE];
		snprintf(response, sizeof(response), "SS %s %d %ld", ss_snap.ip, ss_snap.client_port, sentence_idx);
		sendmessage(sockfd, WRITE, ALL_OK, (char*)msg->username, filename, response);
		log_response("NM", peer_ip, peer_port, msg->username, WRITE, ALL_OK, "WRITE session approved");
	} else if (strcasecmp(cmd, "COMPLETE") == 0) {
		char *status_tok = strtok_r(NULL, " \t\r\n", &saveptr);
		char *words_tok = strtok_r(NULL, " \t\r\n", &saveptr);
		char *chars_tok = strtok_r(NULL, " \t\r\n", &saveptr);
		if (!status_tok || !words_tok || !chars_tok) {
			sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)msg->username, filename, "COMPLETE requires status and counters");
			return;
		}
		char *endptr = NULL;
		long status_val = strtol(status_tok, &endptr, 10);
		if (status_tok == endptr) status_val = ERR_SYSTEM_FAILURE;
		endptr = NULL;
		long words_val = strtol(words_tok, &endptr, 10);
		if (words_tok == endptr || words_val < 0) words_val = 0;
		endptr = NULL;
		long chars_val = strtol(chars_tok, &endptr, 10);
		if (chars_tok == endptr || chars_val < 0) chars_val = 0;
		int success = (status_val == ALL_OK);
		int rc = metadata_finish_write_session(filename,
		                                     msg->username,
		                                     (size_t)words_val,
		                                     (size_t)chars_val,
		                                     success);
		if (rc != 0) {
			ErrorCode err = (rc == ERR_FILE_NOT_FOUND) ? ERR_FILE_NOT_FOUND : ERR_SYSTEM_FAILURE;
			sendmessage(sockfd, WRITE, err, (char*)msg->username, filename, "Failed to finalise write session");
			return;
		}
		char detail[128];
		snprintf(detail, sizeof(detail), "WRITE complete (status=%ld)", status_val);
		sendmessage(sockfd, WRITE, ALL_OK, (char*)msg->username, filename, detail);
		log_response("NM", peer_ip, peer_port, msg->username, WRITE, ALL_OK, detail);
	} else {
		sendmessage(sockfd, WRITE, ERR_INVALID_ARG, (char*)msg->username, filename, "Unknown WRITE command");
	}
}

// Handle SS registration: parse payload and store info
static void handle_register_ss(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	// Expected payload format: "REGISTER_SS;id:<ss_id>;clientport:<port>;files:<file1,file2,...>"
	char payload_copy[PAYLOAD_SIZE + 1];
	strncpy(payload_copy, msg->payload, PAYLOAD_SIZE);
	payload_copy[PAYLOAD_SIZE] = '\0';

	int client_port = 0;
	char *files = NULL;
	char *ss_id = NULL;
	char *saveptr = NULL;
	char *token = strtok_r(payload_copy, ";", &saveptr);
	
	while (token) {
		while (isspace((unsigned char)*token)) token++;
		if (strncmp(token, "clientport:", 11) == 0) {
			client_port = atoi(token + 11);
		} else if (strncmp(token, "files:", 6) == 0) {
			free(files);
			files = strdup(token + 6);
		} else if (strncmp(token, "id:", 3) == 0) {
			free(ss_id);
			ss_id = strdup(token + 3);
		}
		token = strtok_r(NULL, ";", &saveptr);
	}

	if (ss_id) {
		trim_spaces(ss_id);
	}
	if (!ss_id || !*ss_id) {
		log_event("NM", "ERROR", peer_ip, peer_port, NULL, NONE, ERR_INVALID_ARG, "SS registration missing id");
		sendmessage(sockfd, NONE, ERR_INVALID_ARG, NULL, NULL, "SS_ID_REQUIRED");
		if (files) free(files);
		if (ss_id) free(ss_id);
		return;
	}

	if (metadata_register_storage_server(ss_id, peer_ip, peer_port, client_port, files ? files : NULL) != 0) {
		log_event("NM", "ERROR", peer_ip, peer_port, NULL, NONE, ERR_SYSTEM_FAILURE, "metadata register failed");
		sendmessage(sockfd, NONE, ERR_SYSTEM_FAILURE, NULL, NULL, "SS_REGISTER_FAILED");
		if (files) free(files);
		free(ss_id);
		return;
	}
	
	// Log the registration
	char detail[512];
	snprintf(detail, sizeof(detail), "SS registered: id=%s, clientport=%d, files=%s",
	         ss_id, client_port, files ? files : "(none)");
	log_response("NM", peer_ip, peer_port, NULL, NONE, ALL_OK, detail);
	
	// Send ACK
	sendmessage(sockfd, NONE, ALL_OK, NULL, NULL, "SS_REGISTERED");
	
	if (files) free(files);
	free(ss_id);
}

// Handle client initialization
static void handle_client_init(int sockfd, const Message *msg, const char *peer_ip, int peer_port) {
	// Expected: username in msg->username field
	// Optional payload: "clientport:<port>"
	int client_port = 0;
	if (msg->payload_len > 0) {
		if (strncmp(msg->payload, "clientport:", 11) == 0) {
			client_port = atoi(msg->payload + 11);
		}
	}
	
	char detail[256];
	snprintf(detail, sizeof(detail), "Client init: user=%s, port=%d", 
	         msg->username, client_port);
	log_response("NM", peer_ip, peer_port, msg->username, NONE, ALL_OK, detail);
	if (metadata_register_user(msg->username) != 0) {
		log_event("NM", "WARN", peer_ip, peer_port, msg->username, NONE, ERR_SYSTEM_FAILURE, "Failed to register user");
	}
	
	// Send ACK
	sendmessage(sockfd, NONE, ALL_OK, NULL, NULL, "CLIENT_REGISTERED");
}

// Per-connection thread handler
static void *conn_handler(void *arg) {
	int sockfd = *(int*)arg;
	free(arg);
	
	// Get peer address for logging
	struct sockaddr_in peer_addr;
	socklen_t addr_len = sizeof(peer_addr);
	char peer_ip[INET_ADDRSTRLEN] = "unknown";
	int peer_port = 0;
	
	if (getpeername(sockfd, (struct sockaddr*)&peer_addr, &addr_len) == 0) {
		inet_ntop(AF_INET, &peer_addr.sin_addr, peer_ip, sizeof(peer_ip));
		peer_port = ntohs(peer_addr.sin_port);
	}

	while (1) {
		Message msg = {0};
		errno = 0;
		if (recvmessage(sockfd, &msg) < 0) {
			if (errno == 0) {
				log_event("NM", "INFO", peer_ip, peer_port, NULL, NONE, ALL_OK, "peer disconnected");
			} else {
				log_event("NM", "ERROR", peer_ip, peer_port, NULL, NONE, ERR_CONN_FAILED, "recvmessage failed");
			}
			break;
		}

		log_request("NM", peer_ip, peer_port,
		            msg.username[0] ? msg.username : NULL,
		            msg.opn,
		            msg.payload_len > 0 ? msg.payload : NULL);

		if (msg.opn == NONE && msg.payload_len > 0) {
			if (strncmp(msg.payload, "REGISTER_SS;", 12) == 0) {
				Message tmp = msg;
				const char *rest = msg.payload + 12;
				size_t rlen = strlen(rest);
				if (rlen > 0 && rlen <= PAYLOAD_SIZE) {
					memcpy(tmp.payload, rest, rlen + 1);
					tmp.payload_len = (uint16_t)rlen;
				} else {
					tmp.payload[0] = '\0';
					tmp.payload_len = 0;
				}
				handle_register_ss(sockfd, &tmp, peer_ip, peer_port);
			} else if (strncmp(msg.payload, "CLIENT_INIT;", 12) == 0) {
				Message tmp = msg;
				const char *rest = msg.payload + 12;
				size_t rlen = strlen(rest);
				if (rlen > 0 && rlen <= PAYLOAD_SIZE) {
					memcpy(tmp.payload, rest, rlen + 1);
					tmp.payload_len = (uint16_t)rlen;
				} else {
					tmp.payload[0] = '\0';
					tmp.payload_len = 0;
				}
				tmp.username[UNAME_LENGTH-1] = '\0';
				memcpy(tmp.username, msg.username, UNAME_LENGTH);
				handle_client_init(sockfd, &tmp, peer_ip, peer_port);
			} else {
				log_event("NM", "ERROR", peer_ip, peer_port, NULL, NONE, ERR_INVALID_CMD, "unknown init message");
				sendmessage(sockfd, NONE, ERR_INVALID_CMD, NULL, NULL, "UNKNOWN_INIT");
			}
		} else if (msg.opn == VIEW) {
			handle_view_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == LIST) {
			handle_list_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == CREATE) {
			handle_create_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == INFO) {
			handle_info_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == DELETE) {
			handle_delete_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == ADDACCESS) {
			handle_addaccess_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == REMACCESS) {
			handle_remaccess_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == READ) {
			handle_read_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == STREAM) {
			handle_stream_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == EXEC) {
			handle_exec_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == UNDO) {
			handle_undo_request(sockfd, &msg, peer_ip, peer_port);
		} else if (msg.opn == WRITE) {
			handle_write_request(sockfd, &msg, peer_ip, peer_port);
		} else {
			log_event("NM", "ERROR", peer_ip, peer_port, msg.username, msg.opn, ERR_INVALID_CMD, "operation not implemented");
			sendmessage(sockfd, msg.opn, ERR_INVALID_CMD, NULL, NULL, "NOT_IMPLEMENTED");
		}

		if (msg.blob) free(msg.blob);
	}

	destroysocket(sockfd);
	return NULL;
}

int main(int argc, char **argv) {
	int port = 9000; // default NM port
	int seed_demo = 0;
	int port_set = 0;
	for (int i = 1; i < argc; ++i) {
		if (strcmp(argv[i], "--seed-demo") == 0) {
			seed_demo = 1;
		} else if (strcmp(argv[i], "--help") == 0) {
			printf("Usage: %s [port] [--seed-demo]\n", argv[0]);
			return 0;
		} else if (argv[i][0] == '-') {
			fprintf(stderr, "Unknown option: %s\n", argv[i]);
			return 1;
		} else if (!port_set) {
			port = atoi(argv[i]);
			port_set = 1;
		} else {
			fprintf(stderr, "Too many positional arguments\n");
			return 1;
		}
	}
	
	if (metadata_init(NULL) < 0) {
		fprintf(stderr, "[NM] Failed to initialize metadata store\n");
		return 1;
	}
	
	// Initialize logging (echo to stdout for NM)
	if (log_init("nm.log", 1) < 0) {
		fprintf(stderr, "[NM] Failed to initialize logging\n");
		metadata_shutdown();
		return 1;
	}

	if (seed_demo) {
		log_event("NM", "INFO", NULL, port, NULL, NONE, ALL_OK, "--seed-demo flag acknowledged (demo seeding not implemented)");
	}

	// Start server
	int serverfd = serverinit(port);
	if (serverfd < 0) {
		log_event("NM", "ERROR", NULL, port, NULL, NONE, ERR_SYSTEM_FAILURE, "Failed to start server");
		fprintf(stderr, "[NM] Failed to start server on port %d\n", port);
		log_close();
		return 1;
	}
	
	// Log startup
	char startup_msg[128];
	snprintf(startup_msg, sizeof(startup_msg), "Name Server started on port %d", port);
	log_event("NM", "STARTUP", NULL, port, NULL, NONE, ALL_OK, startup_msg);
	
	// Accept connections in loop
	while (1) {
		int cfd = acceptconn(serverfd);
		if (cfd < 0) {
			log_event("NM", "ERROR", NULL, port, NULL, NONE, ERR_CONN_FAILED, "accept failed");
			continue;
		}
		
		// Spawn handler thread
		int *arg = malloc(sizeof(int));
		if (!arg) {
			destroysocket(cfd);
			continue;
		}
		*arg = cfd;
		pthread_t tid;
		if (pthread_create(&tid, NULL, conn_handler, arg) != 0) {
			free(arg);
			destroysocket(cfd);
			log_event("NM", "ERROR", NULL, port, NULL, NONE, ERR_SYSTEM_FAILURE, "pthread_create failed");
			continue;
		}
		pthread_detach(tid);
	}
	
	// Cleanup (unreachable in current infinite loop)
	log_close();
	metadata_shutdown();
	return 0;
}
