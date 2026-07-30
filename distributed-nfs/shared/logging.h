#ifndef LOGGING_H
#define LOGGING_H

#include "shared.h"
#include "error.h"

// Initialize logging subsystem. 'path' is the file path to append logs to.
// If path is NULL, logging will default to stderr only. If echo_stdout is
// non-zero, log lines will also be printed to stdout (useful for NM).
int log_init(const char *path, int echo_stdout);

// Close the logging subsystem and flush file handles.
void log_close(void);

// Generic log event. role is a short string like "NM" or "SS"; event_type
// is one of "REQUEST", "ACK", "RESPONSE", "ERROR", etc. ip may be NULL.
// detail is an optional human readable message (may be NULL).
void log_event(const char *role,
			   const char *event_type,
			   const char *ip,
			   int port,
			   const char *username,
			   Operation opn,
			   ErrorCode err,
			   const char *detail);

// Convenience wrappers
static inline void log_request(const char *role, const char *ip, int port, const char *username, Operation opn, const char *detail) {
	log_event(role, "REQUEST", ip, port, username, opn, ALL_OK, detail);
}

static inline void log_response(const char *role, const char *ip, int port, const char *username, Operation opn, ErrorCode err, const char *detail) {
	log_event(role, "RESPONSE", ip, port, username, opn, err, detail);
}



#endif