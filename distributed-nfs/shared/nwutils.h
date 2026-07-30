#ifndef NWUTILS_H
#define NWUTILS_H

#include "shared.h"
#include "error.h"

// definitions
#define PAYLOAD_SIZE 4096

typedef struct Message {
    // headers
    Operation opn;
    ErrorCode err;
    char username[UNAME_LENGTH];
    char filename[FNAME_LENGTH];
    // payload
    uint16_t payload_len;
    char payload[PAYLOAD_SIZE];
    // transient large-payload pointer. If a large payload was received via
    // the blob protocol, recvmessage() will allocate and set msg->blob and
    // msg->blob_len; the caller is responsible for free(msg->blob).
    void *blob;
    size_t blob_len;
} Message;

// socket helper function declarations
int createsocket();
int serverinit(int port);
int clientinit(const char* servip, int servport);
int acceptconn(int serverfd);
void destroysocket(int sockfd);

// START_TBC
int sendmessage(int sockfd, Operation opn, ErrorCode err, char* username, char* filename, char* payload);
int recvmessage(int sockfd, Message* msg);
// blob transfer helpers: send/receive arbitrary length data
int send_blob(int sockfd, const void *buf, size_t len);
int recv_blob(int sockfd, void **outbuf, size_t *outlen);

// Serialization helpers: pack/unpack a Message into a fixed wire buffer.
// message_serialize writes exactly the number of bytes equal to the wire
// header size (we recommend using a buffer of at least the size returned
// by message_wire_size()). It returns the number of bytes written.
size_t message_serialize(const Message *m, void *outbuf);
int message_deserialize(const void *inbuf, Message *m);
// Returns the fixed wire header size (bytes) that serialize/deserialze use.
size_t message_wire_size(void);
// END_TBC

#endif