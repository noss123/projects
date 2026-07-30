#include "logging.h"

static FILE *logfile = NULL;
static pthread_mutex_t log_mutex = PTHREAD_MUTEX_INITIALIZER;
static int g_echo_stdout = 0;

int log_init(const char *path, int echo_stdout) {
    pthread_mutex_lock(&log_mutex);
    // setting the global echo_stdout flag
    g_echo_stdout = echo_stdout ? 1 : 0;
    if (path) {
        logfile = fopen(path, "a");
        if (!logfile) {
            perror("log_init: fopen");
            pthread_mutex_unlock(&log_mutex);
            return -1;
        }
        // set logfile to be line-buffered
        setvbuf(logfile, NULL, _IOLBF, 0);
    } else {
        // if path is NULL, defaults to logging to stderr
        logfile = stderr;
    }
    pthread_mutex_unlock(&log_mutex);
    return 0;
}

void log_close(void) {
    pthread_mutex_lock(&log_mutex);
    if (logfile && logfile != stderr) fclose(logfile);
    logfile = NULL;
    pthread_mutex_unlock(&log_mutex);
}

static const char* op_to_string(Operation op) {
    switch(op) {
        case VIEW: return "VIEW";
        case READ: return "READ";
        case CREATE: return "CREATE";
        case WRITE: return "WRITE";
        case UNDO: return "UNDO";
        case INFO: return "INFO";
        case DELETE: return "DELETE";
        case STREAM: return "STREAM";
        case LIST: return "LIST";
        case ADDACCESS: return "ADDACCESS";
        case REMACCESS: return "REMACCESS";
        case EXEC: return "EXEC";
        default: return "NONE";
    }
}

void log_event(const char *role,            // NM or SS
               const char *event_type,
               const char *ip,
               int port,
               const char *username,
               Operation opn,
               ErrorCode err,
               const char *detail) {
    char errbuf[256] = {0};
    int has_error = (err != ALL_OK);
    if (has_error) {
        format_error_message(err, detail, errbuf, sizeof(errbuf));
    }

    // build timestamp
    time_t now = time(NULL);
    struct tm tm;
    localtime_r(&now, &tm);
    char timestr[64];
    strftime(timestr, sizeof(timestr), "%Y-%m-%d %H:%M:%S", &tm);

    pthread_mutex_lock(&log_mutex);
    if (!logfile) logfile = stderr;

    // Compose message
    if (ip) {
        fprintf(logfile, "[%s] [%s] [%s] %s:%d user=%s op=%s",
                timestr,
                role ? role : "?",
                event_type ? event_type : "?",
                ip, port,
                username ? username : "NIL",
                op_to_string(opn));
    } else {
        fprintf(logfile, "[%s] [%s] [%s] - user=%s op=%s",
                timestr,
                role ? role : "?",
                event_type ? event_type : "?",
                username ? username : "NIL",
                op_to_string(opn));
    }

    if (has_error && errbuf[0]) {
        fprintf(logfile, " err=\"%s\"", errbuf);
    } else if (detail && detail[0]) {
        fprintf(logfile, " detail=\"%s\"", detail);
    }
    fprintf(logfile, "\n");

    if (g_echo_stdout) {
        // mirror to stdout as well
        if (ip) {
            printf("[%s] [%s] [%s] %s:%d user=%s op=%s",
                    timestr,
                    role ? role : "?",
                    event_type ? event_type : "?",
                    ip, port,
                    username ? username : "NIL",
                    op_to_string(opn));
        } else {
            printf("[%s] [%s] [%s] - user=%s op=%s",
                    timestr,
                    role ? role : "?",
                    event_type ? event_type : "?",
                    username ? username : "NIL",
                    op_to_string(opn));
        }
        if (has_error && errbuf[0]) {
            printf(" err=\"%s\"", errbuf);
        } else if (detail && detail[0]) {
            printf(" detail=\"%s\"", detail);
        }
        printf("\n");
    }

    fflush(logfile);
    pthread_mutex_unlock(&log_mutex);
}
