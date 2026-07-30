#include "../shared/nwutils.h"
#include <strings.h>

static void client_command_loop(void);
static void handle_view_command(int include_all, int long_format);
static void handle_create_command(const char *filename);
static void handle_list_command(void);
static void handle_addaccess_command(const char *flag, const char *filename, const char *target_user);
static void handle_remaccess_command(const char *filename, const char *target_user);
static void handle_read_command(const char *filename);
static void handle_stream_command(const char *filename);
static void handle_exec_command(const char *filename);
static void handle_undo_command(const char *filename);
static void handle_write_command(const char *filename, const char *args);
static void handle_info_command(const char *filename);
static void handle_delete_command(const char *filename);
static void trim_newline(char *s);
static void trim_whitespace(char *s);
static void print_error_line(const char *prefix, ErrorCode err, const char *detail);
static const char *message_detail_str(const Message *msg);
static int notify_nm_write_completion(const char *filename, ErrorCode status, size_t word_count, size_t char_count);
static int notify_nm_read_completion(const char *filename, ErrorCode status);
static int notify_nm_stream_completion(const char *filename, ErrorCode status);
static ErrorCode perform_read_via_ss(const char *ss_ip, int ss_port, const char *filename);
static ErrorCode perform_stream_via_ss(const char *ss_ip, int ss_port, const char *filename);
static ErrorCode display_message_content(int sockfd, Message *reply);
static ErrorCode run_write_session_with_ss(int ss_sockfd,
										  const char *filename,
										  long sentence_idx,
										  size_t *final_words,
										  size_t *final_chars);

// Global state
static char g_username[UNAME_LENGTH];
static int g_nm_sockfd = -1;
static int g_client_ss_port = 0;

// Initialize client: prompt username, connect to NM, send CLIENT_INIT
static int client_initialize(const char *nm_ip, int nm_port, int client_ss_port) {
	// Prompt for username
	printf("Enter username: ");
	fflush(stdout);
	if (!fgets(g_username, sizeof(g_username), stdin)) {
		fprintf(stderr, "Failed to read username\n");
		return -1;
	}
	// Strip newline
	trim_newline(g_username);
	if (strlen(g_username) == 0) {
		fprintf(stderr, "Username cannot be empty\n");
		return -1;
	}
	
	printf("Connecting to Name Server at %s:%d...\n", nm_ip, nm_port);
	
	// Connect to NM
	g_nm_sockfd = clientinit(nm_ip, nm_port);
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Failed to connect to Name Server\n");
		return -1;
	}

	// Record SS port for later features (direct SS interactions)
	g_client_ss_port = client_ss_port;

	// Discover local IP/port used by this NM connection
	struct sockaddr_in local_addr;
	socklen_t addr_len = sizeof(local_addr);
	char client_ip[INET_ADDRSTRLEN] = "0.0.0.0";
	int client_nm_port = 0;
	if (getsockname(g_nm_sockfd, (struct sockaddr*)&local_addr, &addr_len) == 0) {
		inet_ntop(AF_INET, &local_addr.sin_addr, client_ip, sizeof(client_ip));
		client_nm_port = ntohs(local_addr.sin_port);
	}
	
	// Build CLIENT_INIT payload (NM will extract IP/port from socket)
	// Format: CLIENT_INIT;client_ip:<ip>;client_nm_port:<port>;client_ss_port:<port>
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload),
	         "CLIENT_INIT;client_ip:%s;client_nm_port:%d;client_ss_port:%d",
	         client_ip, client_nm_port, g_client_ss_port);
	
	// Send initialization message with username
	if (sendmessage(g_nm_sockfd, NONE, ALL_OK, g_username, NULL, payload) < 0) {
		fprintf(stderr, "Failed to send initialization message\n");
		destroysocket(g_nm_sockfd);
		g_nm_sockfd = -1;
		return -1;
	}
	
	// Receive acknowledgment
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive acknowledgment from Name Server\n");
		destroysocket(g_nm_sockfd);
		g_nm_sockfd = -1;
		return -1;
	}
	
	if (reply.err != ALL_OK) {
		print_error_line("Name Server rejected initialization", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		destroysocket(g_nm_sockfd);
		g_nm_sockfd = -1;
		return -1;
	}
	
	printf("Successfully connected to Name Server as '%s'\n", g_username);
	if (reply.blob) free(reply.blob);
	return 0;
}

// Cleanup on exit
static void client_cleanup(void) {
	if (g_nm_sockfd >= 0) {
		destroysocket(g_nm_sockfd);
		g_nm_sockfd = -1;
	}
}

int main(int argc, char **argv) {
	if (argc < 3) {
		fprintf(stderr, "Usage: %s <nm_ip> <nm_port>\n", argv[0]);
		return 1;
	}
	
	const char *nm_ip = argv[1];
	int nm_port = atoi(argv[2]);
	int client_ss_port = 0;
	if (argc >= 4) {
		client_ss_port = atoi(argv[3]);
	}
	if (client_ss_port <= 0) {
		fprintf(stderr, "Usage: %s <nm_ip> <nm_port> <client_ss_port>\n", argv[0]);
		return 1;
	}
	
	// Initialize and connect
	if (client_initialize(nm_ip, nm_port, client_ss_port) < 0) {
		return 1;
	}
	
	client_command_loop();
	client_cleanup();
	return 0;
}

static void trim_newline(char *s) {
	if (!s) return;
	size_t len = strlen(s);
	while (len > 0 && (s[len-1] == '\n' || s[len-1] == '\r')) {
		s[len-1] = '\0';
		len--;
	}
}

static void trim_whitespace(char *s) {
	if (!s) return;
	size_t len = strlen(s);
	size_t start = 0;
	while (start < len && isspace((unsigned char)s[start])) start++;
	size_t end = len;
	while (end > start && isspace((unsigned char)s[end - 1])) end--;
	if (start > 0 && end > start) memmove(s, s + start, end - start);
	s[end - start] = '\0';
}

static void print_error_line(const char *prefix, ErrorCode err, const char *detail) {
	char formatted[256];
	const char *tag = prefix ? prefix : "Error";
	format_error_message(err, detail, formatted, sizeof(formatted));
	fprintf(stderr, "%s: %s\n", tag, formatted);
}

static const char *message_detail_str(const Message *msg) {
	if (!msg) return NULL;
	if (msg->payload_len > 0) return msg->payload;
	if (msg->blob && msg->blob_len > 0) return msg->blob;
	return NULL;
}

static void client_command_loop(void) {
	char line[1024];
	printf("\nClient ready. Type commands (VIEW, etc.) or 'quit' to exit.\n");
	while (1) {
		printf("\nClient: ");
		fflush(stdout);
		if (!fgets(line, sizeof(line), stdin)) {
			printf("\nExiting.\n");
			break;
		}
		trim_newline(line);
		char *cursor = line;
		while (*cursor && isspace((unsigned char)*cursor)) cursor++;
		if (*cursor == '\0') continue;
		if (strcasecmp(cursor, "quit") == 0 || strcasecmp(cursor, "exit") == 0) {
			break;
		}
		char *saveptr = NULL;
		char *cmd = strtok_r(cursor, " ", &saveptr);
		if (!cmd) continue;
		if (strcasecmp(cmd, "VIEW") == 0) {
			int include_all = 0;
			int long_format = 0;
			char *arg = strtok_r(NULL, " ", &saveptr);
			while (arg) {
				if (arg[0] == '-') {
					for (size_t i = 1; arg[i]; ++i) {
						if (arg[i] == 'a' || arg[i] == 'A') include_all = 1;
						else if (arg[i] == 'l' || arg[i] == 'L') long_format = 1;
						else printf("Ignoring unknown flag '-%c'\n", arg[i]);
					}
				} else {
					printf("Ignoring unexpected argument '%s'\n", arg);
				}
				arg = strtok_r(NULL, " ", &saveptr);
			}
			handle_view_command(include_all, long_format);
		} else if (strcasecmp(cmd, "LIST") == 0) {
			handle_list_command();
		} else if (strcasecmp(cmd, "CREATE") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (fname) trim_whitespace(fname);
			if (!fname || fname[0] == '\0') {
				printf("Usage: CREATE <filename>\n");
				continue;
			}
			handle_create_command(fname);
		} else if (strcasecmp(cmd, "ADDACCESS") == 0) {
			char *flag = strtok_r(NULL, " ", &saveptr);
			char *fname = strtok_r(NULL, " ", &saveptr);
			char *user = strtok_r(NULL, " ", &saveptr);
			if (!flag || !fname || !user) {
				printf("Usage: ADDACCESS -R|-W <filename> <username>\n");
				continue;
			}
			handle_addaccess_command(flag, fname, user);
		} else if (strcasecmp(cmd, "REMACCESS") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			char *user = strtok_r(NULL, " ", &saveptr);
			if (!fname || !user) {
				printf("Usage: REMACCESS <filename> <username>\n");
				continue;
			}
			handle_remaccess_command(fname, user);
		} else if (strcasecmp(cmd, "READ") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (!fname) {
				printf("Usage: READ <filename>\n");
				continue;
			}
			handle_read_command(fname);
		} else if (strcasecmp(cmd, "STREAM") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (!fname) {
				printf("Usage: STREAM <filename>\n");
				continue;
			}
			handle_stream_command(fname);
		} else if (strcasecmp(cmd, "EXEC") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (!fname) {
				printf("Usage: EXEC <filename>\n");
				continue;
			}
			handle_exec_command(fname);
		} else if (strcasecmp(cmd, "UNDO") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (!fname) {
				printf("Usage: UNDO <filename>\n");
				continue;
			}
			handle_undo_command(fname);
		} else if (strcasecmp(cmd, "WRITE") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			char *rest = strtok_r(NULL, "", &saveptr);
			if (!fname) {
				printf("Usage: WRITE <filename> [details]\n");
				continue;
			}
			handle_write_command(fname, rest);
		} else if (strcasecmp(cmd, "INFO") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (!fname) {
				printf("Usage: INFO <filename>\n");
				continue;
			}
			handle_info_command(fname);
		} else if (strcasecmp(cmd, "DELETE") == 0) {
			char *fname = strtok_r(NULL, " ", &saveptr);
			if (!fname) {
				printf("Usage: DELETE <filename>\n");
				continue;
			}
			handle_delete_command(fname);
		} else {
			printf("Unknown command '%s'.\n", cmd);
		}
	}
}

static void handle_view_command(int include_all, int long_format) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char payload[PAYLOAD_SIZE];
	if (include_all || long_format) {
		payload[0] = '-';
		int idx = 1;
		if (include_all) payload[idx++] = 'a';
		if (long_format) payload[idx++] = 'l';
		payload[idx] = '\0';
	} else {
		payload[0] = '\0';
	}
	if (sendmessage(g_nm_sockfd, VIEW, ALL_OK, g_username, NULL, payload) < 0) {
		fprintf(stderr, "Failed to send VIEW request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive VIEW response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("VIEW failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	const char *data = NULL;
	size_t data_len = 0;
	if (reply.blob) {
		data = reply.blob;
		data_len = reply.blob_len;
	} else {
		data = reply.payload;
		data_len = reply.payload_len;
	}
	if (data_len == 0 || !data) {
		printf("(no data)\n");
	} else {
		fwrite(data, 1, data_len, stdout);
		if (data[data_len - 1] != '\n') putchar('\n');
	}
	if (reply.blob) free(reply.blob);
}

static void handle_create_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("CREATE requires a filename.\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, CREATE, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send CREATE request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive CREATE response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("CREATE failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	if (reply.payload_len > 0) {
		printf("%.*s\n", reply.payload_len, reply.payload);
	} else {
		printf("File '%s' created successfully.\n", fname);
	}
	if (reply.blob) free(reply.blob);
}

static void handle_list_command(void) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, LIST, ALL_OK, g_username, NULL, NULL) < 0) {
		fprintf(stderr, "Failed to send LIST request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive LIST response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("LIST failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	const char *data = NULL;
	size_t data_len = 0;
	if (reply.blob) {
		data = reply.blob;
		data_len = reply.blob_len;
	} else {
		data = reply.payload;
		data_len = reply.payload_len;
	}
	if (!data || data_len == 0) {
		printf("(no users)\n");
	} else {
		fwrite(data, 1, data_len, stdout);
		if (data[data_len - 1] != '\n') putchar('\n');
	}
	if (reply.blob) free(reply.blob);
}

static void handle_addaccess_command(const char *flag, const char *filename, const char *target_user) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	char user[UNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	strncpy(user, target_user, sizeof(user) - 1);
	user[sizeof(user) - 1] = '\0';
	trim_whitespace(fname);
	trim_whitespace(user);
	if (fname[0] == '\0' || user[0] == '\0') {
		printf("Usage: ADDACCESS -R|-W <filename> <username>\n");
		return;
	}
	const char *mode_ptr = flag;
	if (mode_ptr[0] == '-') mode_ptr++;
	if (mode_ptr[0] == '\0') {
		printf("Mode must be -R or -W.\n");
		return;
	}
	char mode_char = toupper((unsigned char)mode_ptr[0]);
	if (mode_char != 'R' && mode_char != 'W') {
		printf("Mode must be -R or -W.\n");
		return;
	}
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload), "%c %s", mode_char, user);
	if (sendmessage(g_nm_sockfd, ADDACCESS, ALL_OK, g_username, fname, payload) < 0) {
		fprintf(stderr, "Failed to send ADDACCESS request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive ADDACCESS response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("ADDACCESS failed", reply.err, message_detail_str(&reply));
	} else if (reply.payload_len > 0) {
		printf("%.*s\n", reply.payload_len, reply.payload);
	} else {
		printf("Access updated successfully.\n");
	}
	if (reply.blob) free(reply.blob);
}

static void handle_remaccess_command(const char *filename, const char *target_user) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	char user[UNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	strncpy(user, target_user, sizeof(user) - 1);
	user[sizeof(user) - 1] = '\0';
	trim_whitespace(fname);
	trim_whitespace(user);
	if (fname[0] == '\0' || user[0] == '\0') {
		printf("Usage: REMACCESS <filename> <username>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, REMACCESS, ALL_OK, g_username, fname, user) < 0) {
		fprintf(stderr, "Failed to send REMACCESS request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive REMACCESS response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("REMACCESS failed", reply.err, message_detail_str(&reply));
	} else if (reply.payload_len > 0) {
		printf("%.*s\n", reply.payload_len, reply.payload);
	} else {
		printf("Access removed successfully.\n");
	}
	if (reply.blob) free(reply.blob);
}

static void handle_read_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: READ <filename>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, READ, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send READ request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive READ response.\n");
		return;
	}
	int notify_needed = 0;
	ErrorCode session_status = ERR_SYSTEM_FAILURE;
	if (reply.err != ALL_OK) {
		print_error_line("READ failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	const char *resp = NULL;
	size_t resp_len = 0;
	if (reply.blob) {
		resp = reply.blob;
		resp_len = reply.blob_len;
	} else if (reply.payload_len > 0) {
		resp = reply.payload;
		resp_len = reply.payload_len;
	}
	if (!resp || resp_len == 0) {
		fprintf(stderr, "Name Server response missing SS endpoint.\n");
		if (reply.blob) free(reply.blob);
		return;
	}
	char resp_copy[PAYLOAD_SIZE + 1];
	size_t copy_len = resp_len;
	if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
	memcpy(resp_copy, resp, copy_len);
	resp_copy[copy_len] = '\0';
	char ss_ip[INET_ADDRSTRLEN] = {0};
	int ss_port = 0;
	if (sscanf(resp_copy, "SS %15s %d", ss_ip, &ss_port) < 2) {
		fprintf(stderr, "Invalid READ routing info: %s\n", resp_copy);
		if (reply.blob) free(reply.blob);
		return;
	}
	if (ss_port <= 0) {
		fprintf(stderr, "Invalid storage server port for READ.\n");
		if (reply.blob) free(reply.blob);
		return;
	}
	notify_needed = 1;
	session_status = perform_read_via_ss(ss_ip, ss_port, fname);
	if (reply.blob) free(reply.blob);
	if (notify_needed) {
		if (notify_nm_read_completion(fname, session_status) < 0) {
			fprintf(stderr, "Warning: failed to notify Name Server about READ completion.\n");
		}
	}
}

static void handle_stream_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: STREAM <filename>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, STREAM, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send STREAM request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive STREAM response.\n");
		return;
	}
	int notify_needed = 0;
	ErrorCode session_status = ERR_SYSTEM_FAILURE;
	if (reply.err != ALL_OK) {
		print_error_line("STREAM failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	const char *resp = NULL;
	size_t resp_len = 0;
	if (reply.blob) {
		resp = reply.blob;
		resp_len = reply.blob_len;
	} else if (reply.payload_len > 0) {
		resp = reply.payload;
		resp_len = reply.payload_len;
	}
	if (!resp || resp_len == 0) {
		fprintf(stderr, "Name Server response missing SS endpoint.\n");
		if (reply.blob) free(reply.blob);
		return;
	}
	char resp_copy[PAYLOAD_SIZE + 1];
	size_t copy_len = resp_len;
	if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
	memcpy(resp_copy, resp, copy_len);
	resp_copy[copy_len] = '\0';
	char ss_ip[INET_ADDRSTRLEN] = {0};
	int ss_port = 0;
	if (sscanf(resp_copy, "SS %15s %d", ss_ip, &ss_port) < 2) {
		fprintf(stderr, "Invalid STREAM routing info: %s\n", resp_copy);
		if (reply.blob) free(reply.blob);
		return;
	}
	if (ss_port <= 0) {
		fprintf(stderr, "Invalid storage server port for STREAM.\n");
		if (reply.blob) free(reply.blob);
		return;
	}
	notify_needed = 1;
	session_status = perform_stream_via_ss(ss_ip, ss_port, fname);
	if (reply.blob) free(reply.blob);
	if (notify_needed) {
		if (notify_nm_stream_completion(fname, session_status) < 0) {
			fprintf(stderr, "Warning: failed to notify Name Server about STREAM completion.\n");
		}
	}
}

static void handle_exec_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: EXEC <filename>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, EXEC, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send EXEC request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive EXEC response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("EXEC failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	if (display_message_content(g_nm_sockfd, &reply) != ALL_OK) {
		fprintf(stderr, "Failed to display EXEC output.\n");
	}
	if (reply.blob) free(reply.blob);
}

static void handle_undo_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: UNDO <filename>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, UNDO, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send UNDO request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive UNDO response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("UNDO failed", reply.err, message_detail_str(&reply));
	} else if (reply.payload_len > 0) {
		printf("%.*s\n", reply.payload_len, reply.payload);
	} else {
		printf("Undo successful.\n");
	}
	if (reply.blob) free(reply.blob);
}

static void handle_write_command(const char *filename, const char *args) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: WRITE <filename> <sentence_index>\n");
		return;
	}
	if (!args) {
		printf("Usage: WRITE <filename> <sentence_index>\n");
		return;
	}
	char argbuf[PAYLOAD_SIZE];
	strncpy(argbuf, args, sizeof(argbuf) - 1);
	argbuf[sizeof(argbuf) - 1] = '\0';
	trim_whitespace(argbuf);
	if (argbuf[0] == '\0') {
		printf("Usage: WRITE <filename> <sentence_index>\n");
		return;
	}
	char *endptr = NULL;
	long sentence_idx = strtol(argbuf, &endptr, 10);
	if (argbuf == endptr || sentence_idx < 0) {
		printf("Sentence index must be a non-negative integer.\n");
		return;
	}
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload), "START %ld", sentence_idx);
	if (sendmessage(g_nm_sockfd, WRITE, ALL_OK, g_username, fname, payload) < 0) {
		fprintf(stderr, "Failed to contact Name Server for WRITE.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive WRITE routing info.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("WRITE denied", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return;
	}
	char ss_ip[INET_ADDRSTRLEN] = {0};
	int ss_port = 0;
	long confirmed_idx = sentence_idx;
	const char *resp = NULL;
	size_t resp_len = 0;
	if (reply.blob) {
		resp = reply.blob;
		resp_len = reply.blob_len;
	} else if (reply.payload_len > 0) {
		resp = reply.payload;
		resp_len = reply.payload_len;
	}
	if (!resp || resp_len == 0) {
		fprintf(stderr, "Name Server response missing SS endpoint.\n");
		if (reply.blob) free(reply.blob);
		notify_nm_write_completion(fname, ERR_SYSTEM_FAILURE, 0, 0);
		return;
	}
	char resp_copy[PAYLOAD_SIZE + 1];
	size_t copy_len = resp_len;
	if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
	memcpy(resp_copy, resp, copy_len);
	resp_copy[copy_len] = '\0';
	if (sscanf(resp_copy, "SS %15s %d %ld", ss_ip, &ss_port, &confirmed_idx) < 2) {
		fprintf(stderr, "Invalid WRITE routing info: %s\n", resp_copy);
		if (reply.blob) free(reply.blob);
		notify_nm_write_completion(fname, ERR_SYSTEM_FAILURE, 0, 0);
		return;
	}
	if (reply.blob) free(reply.blob);
	if (ss_port <= 0) {
		fprintf(stderr, "Invalid storage server port from Name Server.\n");
		notify_nm_write_completion(fname, ERR_SYSTEM_FAILURE, 0, 0);
		return;
	}
	int ss_sockfd = clientinit(ss_ip, ss_port);
	if (ss_sockfd < 0) {
		fprintf(stderr, "Failed to reach Storage Server %s:%d.\n", ss_ip, ss_port);
		notify_nm_write_completion(fname, ERR_CONN_FAILED, 0, 0);
		return;
	}
	size_t final_words = 0;
	size_t final_chars = 0;
	ErrorCode session_status = run_write_session_with_ss(ss_sockfd, fname, confirmed_idx, &final_words, &final_chars);
	destroysocket(ss_sockfd);
	notify_nm_write_completion(fname, session_status, final_words, final_chars);
}

static void handle_info_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: INFO <filename>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, INFO, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send INFO request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive INFO response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("INFO failed", reply.err, message_detail_str(&reply));
	} else if (reply.blob) {
		fwrite(reply.blob, 1, reply.blob_len, stdout);
		if (reply.blob_len == 0 || ((char*)reply.blob)[reply.blob_len - 1] != '\n') putchar('\n');
	} else if (reply.payload_len > 0) {
		printf("%.*s", reply.payload_len, reply.payload);
		if (reply.payload[reply.payload_len - 1] != '\n') putchar('\n');
	} else {
		printf("(no info available)\n");
	}
	if (reply.blob) free(reply.blob);
}

static void handle_delete_command(const char *filename) {
	if (g_nm_sockfd < 0) {
		fprintf(stderr, "Not connected to Name Server.\n");
		return;
	}
	char fname[FNAME_LENGTH];
	strncpy(fname, filename, sizeof(fname) - 1);
	fname[sizeof(fname) - 1] = '\0';
	trim_whitespace(fname);
	if (fname[0] == '\0') {
		printf("Usage: DELETE <filename>\n");
		return;
	}
	if (sendmessage(g_nm_sockfd, DELETE, ALL_OK, g_username, fname, NULL) < 0) {
		fprintf(stderr, "Failed to send DELETE request.\n");
		return;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive DELETE response.\n");
		return;
	}
	if (reply.err != ALL_OK) {
		print_error_line("DELETE failed", reply.err, message_detail_str(&reply));
	} else if (reply.payload_len > 0) {
		printf("%.*s\n", reply.payload_len, reply.payload);
	} else {
		printf("File '%s' deleted successfully!\n", fname);
	}
	if (reply.blob) free(reply.blob);
}

static int notify_nm_read_completion(const char *filename, ErrorCode status) {
	if (g_nm_sockfd < 0) return -1;
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload), "COMPLETE %d", status);
	if (sendmessage(g_nm_sockfd, READ, ALL_OK, g_username, (char*)filename, payload) < 0) {
		fprintf(stderr, "Failed to notify Name Server about READ completion.\n");
		return -1;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive READ completion ACK from Name Server.\n");
		return -1;
	}
	if (reply.err != ALL_OK) {
		print_error_line("READ completion ACK error", reply.err, message_detail_str(&reply));
	}
	if (reply.blob) free(reply.blob);
	return 0;
}

static int notify_nm_stream_completion(const char *filename, ErrorCode status) {
	if (g_nm_sockfd < 0) return -1;
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload), "COMPLETE %d", status);
	if (sendmessage(g_nm_sockfd, STREAM, ALL_OK, g_username, (char*)filename, payload) < 0) {
		fprintf(stderr, "Failed to notify Name Server about STREAM completion.\n");
		return -1;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive STREAM completion ACK from Name Server.\n");
		return -1;
	}
	if (reply.err != ALL_OK) {
		print_error_line("STREAM completion ACK error", reply.err, message_detail_str(&reply));
	}
	if (reply.blob) free(reply.blob);
	return 0;
}

static ErrorCode perform_read_via_ss(const char *ss_ip, int ss_port, const char *filename) {
	int ss_sockfd = clientinit(ss_ip, ss_port);
	if (ss_sockfd < 0) {
		fprintf(stderr, "Failed to reach Storage Server %s:%d.\n", ss_ip, ss_port);
		return ERR_CONN_FAILED;
	}
	if (sendmessage(ss_sockfd, READ, ALL_OK, g_username, (char*)filename, NULL) < 0) {
		fprintf(stderr, "Failed to send READ request to Storage Server.\n");
		destroysocket(ss_sockfd);
		return ERR_CONN_FAILED;
	}
	Message reply;
	if (recvmessage(ss_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive data from Storage Server.\n");
		destroysocket(ss_sockfd);
		return ERR_CONN_FAILED;
	}
	if (reply.err != ALL_OK) {
		print_error_line("READ error", reply.err, message_detail_str(&reply));
		ErrorCode err = reply.err;
		if (reply.blob) free(reply.blob);
		destroysocket(ss_sockfd);
		return err;
	}
	ErrorCode status = display_message_content(ss_sockfd, &reply);
	if (reply.blob) free(reply.blob);
	destroysocket(ss_sockfd);
	return status;
}

static ErrorCode perform_stream_via_ss(const char *ss_ip, int ss_port, const char *filename) {
	int ss_sockfd = clientinit(ss_ip, ss_port);
	if (ss_sockfd < 0) {
		fprintf(stderr, "Failed to reach Storage Server %s:%d.\n", ss_ip, ss_port);
		return ERR_CONN_FAILED;
	}
	if (sendmessage(ss_sockfd, STREAM, ALL_OK, g_username, (char*)filename, NULL) < 0) {
		fprintf(stderr, "Failed to send STREAM request to Storage Server.\n");
		destroysocket(ss_sockfd);
		return ERR_CONN_FAILED;
	}
	ErrorCode status = ERR_STREAM_INTERRUPTED;
	int printed_words = 0;
	int announced = 0;
	while (1) {
		Message chunk = {0};
		if (recvmessage(ss_sockfd, &chunk) < 0) {
			fprintf(stderr, "STREAM interrupted: connection lost.\n");
			break;
		}
		if (chunk.opn != STREAM) {
			fprintf(stderr, "Unexpected response during STREAM (op=%d).\n", chunk.opn);
			status = ERR_INVALID_CMD;
			if (chunk.blob) free(chunk.blob);
			break;
		}
		if (chunk.err != ALL_OK) {
			print_error_line("STREAM error", chunk.err, message_detail_str(&chunk));
			status = chunk.err;
			if (chunk.blob) free(chunk.blob);
			break;
		}
		const char *segment = NULL;
		size_t seg_len = 0;
		if (chunk.blob) {
			segment = chunk.blob;
			seg_len = chunk.blob_len;
		} else {
			segment = chunk.payload;
			seg_len = chunk.payload_len;
		}
		char token[PAYLOAD_SIZE + 1] = {0};
		if (segment && seg_len > 0) {
			size_t copy_len = seg_len;
			if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
			memcpy(token, segment, copy_len);
			token[copy_len] = '\0';
		}
		if (strcasecmp(token, "BEGIN") == 0) {
			if (!announced) {
				printf("Streaming '%s'...\n", filename);
				fflush(stdout);
				announced = 1;
			}
			if (chunk.blob) free(chunk.blob);
			continue;
		}
		if (strcasecmp(token, "END") == 0) {
			if (printed_words) {
				putchar('\n');
			} else {
				printf("(empty stream)\n");
			}
			status = ALL_OK;
			if (chunk.blob) free(chunk.blob);
			break;
		}
		if (token[0] != '\0') {
			printf("%s ", token);
			fflush(stdout);
			printed_words = 1;
		}
		if (chunk.blob) free(chunk.blob);
	}
	destroysocket(ss_sockfd);
	return status;
}

static ErrorCode display_message_content(int sockfd, Message *reply) {
	if (reply->payload_len >= 4 && strncasecmp(reply->payload, "BLOB", 4) == 0) {
		void *buf = NULL;
		size_t len = 0;
		if (recv_blob(sockfd, &buf, &len) < 0) {
			fprintf(stderr, "Failed to receive file content blob.\n");
			return ERR_CONN_FAILED;
		}
		if (len > 0) {
			fwrite(buf, 1, len, stdout);
			if (((char*)buf)[len - 1] != '\n') putchar('\n');
		} else {
			printf("\n");
		}
		free(buf);
		return ALL_OK;
	}
	if (reply->blob) {
		size_t len = reply->blob_len;
		if (len > 0) {
			fwrite(reply->blob, 1, len, stdout);
			if (((char*)reply->blob)[len - 1] != '\n') putchar('\n');
		} else {
			printf("\n");
		}
		return ALL_OK;
	}
	if (reply->payload_len > 0) {
		fwrite(reply->payload, 1, reply->payload_len, stdout);
		if (reply->payload[reply->payload_len - 1] != '\n') putchar('\n');
	} else {
		printf("\n");
	}
	return ALL_OK;
}

static int notify_nm_write_completion(const char *filename, ErrorCode status, size_t word_count, size_t char_count) {
	if (g_nm_sockfd < 0) return -1;
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload), "COMPLETE %d %zu %zu", status, word_count, char_count);
	if (sendmessage(g_nm_sockfd, WRITE, ALL_OK, g_username, (char*)filename, payload) < 0) {
		fprintf(stderr, "Failed to notify Name Server about WRITE completion.\n");
		return -1;
	}
	Message reply;
	if (recvmessage(g_nm_sockfd, &reply) < 0) {
		fprintf(stderr, "Failed to receive WRITE completion ACK from Name Server.\n");
		return -1;
	}
	if (reply.err != ALL_OK) {
		print_error_line("WRITE completion ACK error", reply.err, message_detail_str(&reply));
	}
	if (reply.blob) free(reply.blob);
	return 0;
}

static ErrorCode run_write_session_with_ss(int ss_sockfd,
	                                      const char *filename,
	                                      long sentence_idx,
	                                      size_t *final_words,
	                                      size_t *final_chars) {
	char payload[PAYLOAD_SIZE];
	snprintf(payload, sizeof(payload), "BEGIN %ld", sentence_idx);
	if (sendmessage(ss_sockfd, WRITE, ALL_OK, g_username, (char*)filename, payload) < 0) {
		return ERR_CONN_FAILED;
	}
	Message reply;
	if (recvmessage(ss_sockfd, &reply) < 0) {
		return ERR_CONN_FAILED;
	}
	if (reply.err != ALL_OK) {
		print_error_line("WRITE failed", reply.err, message_detail_str(&reply));
		if (reply.blob) free(reply.blob);
		return reply.err;
	}
	const char *detail = NULL;
	size_t detail_len = 0;
	if (reply.blob) {
		detail = reply.blob;
		detail_len = reply.blob_len;
	} else if (reply.payload_len > 0) {
		detail = reply.payload;
		detail_len = reply.payload_len;
	}
	if (detail && detail_len > 0) {
		printf("%.*s\n", (int)detail_len, detail);
	}
	if (reply.blob) free(reply.blob);
	printf("Enter '<word_index> <content>' per line. Type 'ETIRW' to commit or 'ABORT' to cancel.\n");
	char line[PAYLOAD_SIZE];
	while (1) {
		printf("WRITE> ");
		fflush(stdout);
		if (!fgets(line, sizeof(line), stdin)) {
			printf("Input closed. Aborting WRITE.\n");
			snprintf(payload, sizeof(payload), "ABORT");
			sendmessage(ss_sockfd, WRITE, ALL_OK, g_username, (char*)filename, payload);
			if (recvmessage(ss_sockfd, &reply) >= 0 && reply.blob) free(reply.blob);
			return ERR_INVALID_CMD;
		}
		trim_newline(line);
		trim_whitespace(line);
		if (line[0] == '\0') continue;
		if (strcasecmp(line, "ETIRW") == 0) {
			snprintf(payload, sizeof(payload), "COMMIT");
			if (sendmessage(ss_sockfd, WRITE, ALL_OK, g_username, (char*)filename, payload) < 0) {
				return ERR_CONN_FAILED;
			}
			if (recvmessage(ss_sockfd, &reply) < 0) {
				return ERR_CONN_FAILED;
			}
			if (reply.err != ALL_OK) {
				print_error_line("WRITE commit failed", reply.err, message_detail_str(&reply));
				if (reply.blob) free(reply.blob);
				return reply.err;
			}
			const char *resp = NULL;
			size_t resp_len = 0;
			if (reply.blob) {
				resp = reply.blob;
				resp_len = reply.blob_len;
			} else if (reply.payload_len > 0) {
				resp = reply.payload;
				resp_len = reply.payload_len;
			}
			size_t words = 0, chars = 0;
			if (resp && resp_len > 0) {
				char resp_copy[PAYLOAD_SIZE + 1];
				size_t copy_len = resp_len;
				if (copy_len > PAYLOAD_SIZE) copy_len = PAYLOAD_SIZE;
				memcpy(resp_copy, resp, copy_len);
				resp_copy[copy_len] = '\0';
				if (sscanf(resp_copy, "OK %zu %zu", &words, &chars) != 2) {
					printf("%s\n", resp_copy);
				} else {
					printf("Write successful. Words=%zu Chars=%zu\n", words, chars);
				}
			}
			if (final_words) *final_words = words;
			if (final_chars) *final_chars = chars;
			if (reply.blob) free(reply.blob);
			return ALL_OK;
		}
		if (strcasecmp(line, "ABORT") == 0) {
			snprintf(payload, sizeof(payload), "ABORT");
			sendmessage(ss_sockfd, WRITE, ALL_OK, g_username, (char*)filename, payload);
			if (recvmessage(ss_sockfd, &reply) >= 0 && reply.blob) free(reply.blob);
			printf("WRITE aborted.\n");
			return ERR_INVALID_CMD;
		}
		char workbuf[PAYLOAD_SIZE];
		strncpy(workbuf, line, sizeof(workbuf) - 1);
		workbuf[sizeof(workbuf) - 1] = '\0';
		char *saveptr = NULL;
		char *idx_tok = strtok_r(workbuf, " ", &saveptr);
		char *content = strtok_r(NULL, "", &saveptr);
		if (!idx_tok || !content) {
			printf("Format: <word_index> <content>\n");
			continue;
		}
		trim_whitespace(content);
		char *endptr = NULL;
		long word_idx = strtol(idx_tok, &endptr, 10);
		if (idx_tok == endptr) {
			printf("Invalid word index.\n");
			continue;
		}
		if (word_idx < 0) {
			printf("Word index must be non-negative.\n");
			continue;
		}
		if (content[0] == '\0') {
			printf("Content cannot be empty.\n");
			continue;
		}
		snprintf(payload, sizeof(payload), "APPLY %ld %s", word_idx, content);
		if (sendmessage(ss_sockfd, WRITE, ALL_OK, g_username, (char*)filename, payload) < 0) {
			return ERR_CONN_FAILED;
		}
		if (recvmessage(ss_sockfd, &reply) < 0) {
			return ERR_CONN_FAILED;
		}
		if (reply.err != ALL_OK) {
			print_error_line("WRITE update error", reply.err, message_detail_str(&reply));
			if (reply.blob) free(reply.blob);
			if (reply.err == ERR_WORD_INDEX || reply.err == ERR_SENT_INDEX || reply.err == ERR_INVALID_ARG) {
				continue;
			}
			return reply.err;
		}
		if (reply.payload_len > 0) {
			printf("%.*s\n", reply.payload_len, reply.payload);
		} else {
			printf("Sentence updated.\n");
		}
		if (reply.blob) free(reply.blob);
	}
}
