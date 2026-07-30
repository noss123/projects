#ifndef ERROR_H
#define ERROR_H

#include "shared.h"

typedef enum ErrorCode {
    // 2xx : success / informational
    ALL_OK = 200,

    // 4xx : client / request issues
    ERR_INVALID_CMD       = 400,
    ERR_INVALID_ARG       = 422,
    ERR_UNAUTHORISED      = 401,
    ERR_NOT_OWNER         = 403,
    ERR_USER_NOT_FOUND    = 404,
    ERR_FILE_NOT_FOUND    = 410,
    ERR_FILE_EXISTS       = 409,
    ERR_SENT_INDEX        = 420,
    ERR_WORD_INDEX        = 421,
    ERR_NOTHING_TO_UNDO   = 424,
    ERR_FILE_BUSY         = 425,
    ERR_SENT_LOCKED       = 423,

    // 5xx : infrastructure / runtime failures
    ERR_CONN_FAILED       = 503,
    ERR_SERVER_DOWN       = 502,
    ERR_STREAM_INTERRUPTED= 504,
    ERR_SYSTEM_FAILURE    = 500,

    // 9xx : protocol / transport control signals
    ERR_BLOB_FOLLOWS      = 900

} ErrorCode;

// function declarations
const char* geterror(ErrorCode code);
const char* geterror_name(ErrorCode code);
void format_error_message(ErrorCode code, const char *detail, char *out, size_t out_len);

#endif