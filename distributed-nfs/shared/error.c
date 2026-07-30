#include "error.h"

const char* geterror(ErrorCode code) {
    switch(code) {
        case ALL_OK:
            return "Success.";
        case ERR_INVALID_CMD:
            return "Command not recognised.";
        case ERR_INVALID_ARG:
            return "Arguments are invalid or incomplete.";
        case ERR_UNAUTHORISED:
            return "User is not authenticated for this action.";
        case ERR_NOT_OWNER:
            return "Only the file owner may perform this action.";
        case ERR_USER_NOT_FOUND:
            return "Target user does not exist.";
        case ERR_FILE_NOT_FOUND:
            return "Requested file does not exist.";
        case ERR_FILE_EXISTS:
            return "File already exists.";
        case ERR_SENT_INDEX:
            return "Sentence index is out of range.";
        case ERR_WORD_INDEX:
            return "Word index is out of range.";
        case ERR_NOTHING_TO_UNDO:
            return "There is no prior version to undo.";
        case ERR_FILE_BUSY:
            return "File is busy with an active operation.";
        case ERR_SENT_LOCKED:
            return "Sentence is locked by another writer.";
        case ERR_CONN_FAILED:
            return "Failed to reach the remote service.";
        case ERR_SERVER_DOWN:
            return "Storage server is unavailable.";
        case ERR_STREAM_INTERRUPTED:
            return "Streaming operation was interrupted.";
        case ERR_SYSTEM_FAILURE:
            return "Internal server error.";
        case ERR_BLOB_FOLLOWS:
            return "Binary payload follows.";
        default:
            return "Unknown error.";
    }
}

const char* geterror_name(ErrorCode code) {
    switch (code) {
        case ALL_OK: return "ALL_OK";
        case ERR_INVALID_CMD: return "ERR_INVALID_CMD";
        case ERR_INVALID_ARG: return "ERR_INVALID_ARG";
        case ERR_UNAUTHORISED: return "ERR_UNAUTHORISED";
        case ERR_NOT_OWNER: return "ERR_NOT_OWNER";
        case ERR_USER_NOT_FOUND: return "ERR_USER_NOT_FOUND";
        case ERR_FILE_NOT_FOUND: return "ERR_FILE_NOT_FOUND";
        case ERR_FILE_EXISTS: return "ERR_FILE_EXISTS";
        case ERR_SENT_INDEX: return "ERR_SENT_INDEX";
        case ERR_WORD_INDEX: return "ERR_WORD_INDEX";
        case ERR_NOTHING_TO_UNDO: return "ERR_NOTHING_TO_UNDO";
        case ERR_FILE_BUSY: return "ERR_FILE_BUSY";
        case ERR_SENT_LOCKED: return "ERR_SENT_LOCKED";
        case ERR_CONN_FAILED: return "ERR_CONN_FAILED";
        case ERR_SERVER_DOWN: return "ERR_SERVER_DOWN";
        case ERR_STREAM_INTERRUPTED: return "ERR_STREAM_INTERRUPTED";
        case ERR_SYSTEM_FAILURE: return "ERR_SYSTEM_FAILURE";
        case ERR_BLOB_FOLLOWS: return "ERR_BLOB_FOLLOWS";
        default: return "ERR_UNKNOWN";
    }
}

void format_error_message(ErrorCode code, const char *detail, char *out, size_t out_len) {
    if (!out || out_len == 0) return;
    (void)detail; // retained for future detail-sensitive formatting
    const char *name = geterror_name(code);
    const char *desc = geterror(code);
    snprintf(out, out_len, "[%d %s] %s", code, name, desc);
}

