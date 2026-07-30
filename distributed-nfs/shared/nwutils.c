#include "nwutils.h"

int createsocket() {
    // create TCP socket
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd<0) {
        perror("socket creation failed");
        return -1;
    }
    return sockfd;
}

int serverinit(int port) {
    // setup server socket to bind and listen on a particular port
    int sockfd = createsocket();
    if (sockfd<0) {
        // init failed
        return -1;
    }

    int opt = 1;
    if (setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt SO_REUSEADDR failed");
        destroysocket(sockfd);
        return -1;
    }
#ifdef SO_REUSEPORT
    if (setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt)) < 0) {
        perror("setsockopt SO_REUSEPORT failed");
        // not fatal; continue without reuseport support
    }
#endif

    struct sockaddr_in servaddr = {0};
    servaddr.sin_family = AF_INET;                  // address family specifying type of address (IPv4)
    servaddr.sin_addr.s_addr = INADDR_ANY;          // binds to all available interfaces
    servaddr.sin_port = htons(port);                // converts to network byte order, with type uint16_t

    // bind socket to specified port
    if (bind(sockfd, (struct sockaddr*) &servaddr, sizeof(servaddr)) < 0) {
        perror("bind failed");
        destroysocket(sockfd);
        return -1;
    }

    // listen for incoming connections
    // here, we set backlog to SOMAXCONN, which is the maximum queue size of pending connections allowed by the OS
    // this is better than hardcoding a small value (outdated method)
    if (listen(sockfd, SOMAXCONN) < 0) {
        perror("listen failed");
        destroysocket(sockfd);
        return -1;
    }

    return sockfd;
}

int clientinit(const char* servip, int servport) {
    // setup client socket and connect to server
    int sockfd = createsocket();
    if (sockfd<0) {
        return -1;
    }

    struct sockaddr_in servaddr = {0};
    servaddr.sin_family = AF_INET;                  // address family specifying type of address (IPv4)
    servaddr.sin_addr.s_addr = inet_addr(servip);   // stores the ip in binary format
    servaddr.sin_port = htons(servport);            // converts to network byte order, with type uint16_t

    // connect to server
    if (connect(sockfd, (struct sockaddr*) &servaddr, sizeof(servaddr)) < 0) {
        perror("connect failed");
        destroysocket(sockfd);
        return -1;
    }

    return sockfd;
}

int acceptconn(int serverfd) {
    // accept incoming connection on server socket
    struct sockaddr_in cliaddr = {0};
    socklen_t addrlen = sizeof(cliaddr);
    int sockfd = accept(serverfd, (struct sockaddr*) &cliaddr, &addrlen);
    if (sockfd<0) {
        perror("accept failed");
        return -1;
    }
    return sockfd;
}

void destroysocket(int sockfd) {
    // safely close socket
    if (close(sockfd)<0) {
        perror("socket close failed");
    }
}

// START_TBC
// helper function: loop until all bytes are sent
static ssize_t send_all(int sockfd, const void *buf, size_t len) {
    const char *ptr = buf;
    size_t left = len;
    while (left > 0) {
        ssize_t n = send(sockfd, ptr, left, 0);
        if (n < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        ptr += n;
        left -= n;
    }
    return (ssize_t)len;
}

// helper function: receive exactly len bytes
static ssize_t recv_all(int sockfd, void *buf, size_t len) {
    char *p = buf;
    size_t left = len;
    while (left > 0) {
        ssize_t n = recv(sockfd, p, left, 0);
        if (n < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        if (n == 0) return 0; // connection closed by peer
        p += n;
        left -= n;
    }
    return (ssize_t)len;
}

// 64-bit network byte order helpers
static uint64_t htonll(uint64_t v) {
    uint32_t hi = htonl((uint32_t)(v >> 32));
    uint32_t lo = htonl((uint32_t)(v & 0xFFFFFFFFULL));
    return ((uint64_t)lo << 32) | hi;
}

static uint64_t ntohll(uint64_t v) {
    uint32_t hi = ntohl((uint32_t)(v >> 32));
    uint32_t lo = ntohl((uint32_t)(v & 0xFFFFFFFFULL));
    return ((uint64_t)lo << 32) | hi;
}

/*
 * send_blob / recv_blob
 * Protocol: 8-byte big-endian length prefix (uint64_t), followed by exactly that many bytes.
 * recv_blob allocates (*outbuf) (caller must free). outlen receives length.
 * Returns 0 on success, -1 on error.
 */
int send_blob(int sockfd, const void *buf, size_t len) {
    uint64_t len_net = htonll((uint64_t)len);
    if (send_all(sockfd, &len_net, sizeof(len_net)) != (ssize_t)sizeof(len_net)) {
        perror("send_blob: send length failed");
        return -1;
    }
    if (len == 0) return 0;
    if (send_all(sockfd, buf, len) != (ssize_t)len) {
        perror("send_blob: send data failed");
        return -1;
    }
    return 0;
}

int recv_blob(int sockfd, void **outbuf, size_t *outlen) {
    uint64_t len_net;
    ssize_t r = recv_all(sockfd, &len_net, sizeof(len_net));
    if (r <= 0) {
        if (r == 0) {
            fprintf(stderr, "recv_blob: connection closed by peer\n");
            errno = 0;
        } else {
            perror("recv_blob: recv length failed");
        }
        return -1;
    }
    uint64_t len = ntohll(len_net);
    if (outlen) *outlen = (size_t)len;
    if (len == 0) {
        if (outbuf) *outbuf = NULL;
        return 0;
    }
    void *buf = malloc((size_t)len + 1);
    if (!buf) {
        perror("recv_blob: malloc failed");
        return -1;
    }
    r = recv_all(sockfd, buf, (size_t)len);
    if (r <= 0) {
        if (r == 0) {
            fprintf(stderr, "recv_blob: connection closed by peer while receiving data\n");
            errno = 0;
        } else {
            perror("recv_blob: recv data failed");
        }
        free(buf);
        return -1;
    }
    ((char*)buf)[len] = '\0'; // convenience null-termination for text payloads
    if (outbuf) *outbuf = buf;
    return 0;
}

int sendmessage(int sockfd, Operation opn, ErrorCode err, char* username, char* filename, char* payload) {
    // build in-memory message
    Message m = {0};
    m.opn = opn;
    m.err = err;
    strncpy(m.username, username ? username : "", sizeof(m.username) - 1);
    m.username[sizeof(m.username) - 1] = '\0';
    strncpy(m.filename, filename ? filename : "", sizeof(m.filename) - 1);
    m.filename[sizeof(m.filename) - 1] = '\0';

    size_t payload_len = payload ? strlen(payload) : 0;
    m.payload_len = (uint16_t)payload_len;
    if (payload_len > 0 && payload_len <= PAYLOAD_SIZE) {
        memcpy(m.payload, payload, payload_len);
    }

    // serialize header into fixed wire buffer
    size_t wire_size = message_wire_size();
    void *wirebuf = malloc(wire_size);
    if (!wirebuf) {
        perror("sendmessage: malloc failed");
        return -1;
    }

    if (payload_len <= PAYLOAD_SIZE) {
        // small payload fits inline
        if (message_serialize(&m, wirebuf) == 0) {
            free(wirebuf);
            return -1;
        }
        if (send_all(sockfd, wirebuf, wire_size) != (ssize_t)wire_size) {
            perror("sendmessage: send header failed");
            free(wirebuf);
            return -1;
        }
        free(wirebuf);
        return 0;
    }

    // large payload -> send header with ERR_BLOB_FOLLOWS and then blob
    m.err = ERR_BLOB_FOLLOWS;
    m.payload_len = 0;
    if (message_serialize(&m, wirebuf) == 0) {
        free(wirebuf);
        return -1;
    }
    if (send_all(sockfd, wirebuf, wire_size) != (ssize_t)wire_size) {
        perror("sendmessage: send header failed");
        free(wirebuf);
        return -1;
    }
    free(wirebuf);
    if (send_blob(sockfd, payload, payload_len) < 0) {
        fprintf(stderr, "sendmessage: send_blob failed\n");
        return -1;
    }
    return 0;
}

int recvmessage(int sockfd, Message *msg) {
    size_t wire_size = message_wire_size();
    void *wirebuf = malloc(wire_size);
    if (!wirebuf) {
        perror("recvmessage: malloc failed");
        return -1;
    }
    ssize_t r = recv_all(sockfd, wirebuf, wire_size);
    if (r <= 0) {
        if (r == 0) {
            fprintf(stderr, "recvmessage: connection closed by peer\n");
            errno = 0;
        } else {
            perror("recvmessage: recv header failed");
        }
        free(wirebuf);
        return -1;
    }
    if (message_deserialize(wirebuf, msg) < 0) {
        free(wirebuf);
        return -1;
    }
    free(wirebuf);

    // clear blob fields
    msg->blob = NULL;
    msg->blob_len = 0;

    if (msg->err == ERR_BLOB_FOLLOWS) {
        void *buf = NULL;
        size_t len = 0;
        if (recv_blob(sockfd, &buf, &len) < 0) {
            fprintf(stderr, "recvmessage: recv_blob failed\n");
            if (errno == 0) {
                // recv_blob already reported EOF; keep errno at 0 so callers can detect clean close
            }
            return -1;
        }
        msg->blob = buf;
        msg->blob_len = len;
    }
    return 0;
}

// Serialization helpers
size_t message_wire_size(void) {
    return sizeof(uint32_t) /*opn*/ + sizeof(uint32_t) /*err*/ + UNAME_LENGTH + FNAME_LENGTH + sizeof(uint16_t) /*payload_len*/ + PAYLOAD_SIZE;
}

size_t message_serialize(const Message *m, void *outbuf) {
    if (!m || !outbuf) return 0;
    uint8_t *p = (uint8_t*)outbuf;
    uint32_t opn_net = htonl((uint32_t)m->opn);
    uint32_t err_net = htonl((uint32_t)m->err);
    uint16_t payload_len_net = htons(m->payload_len);

    memcpy(p, &opn_net, sizeof(opn_net)); p += sizeof(opn_net);
    memcpy(p, &err_net, sizeof(err_net)); p += sizeof(err_net);
    // fixed-size username and filename fields
    memset(p, 0, UNAME_LENGTH);
    size_t uname_len = strnlen(m->username, UNAME_LENGTH - 1);
    if (uname_len > 0) memcpy(p, m->username, uname_len);
    p += UNAME_LENGTH;
    memset(p, 0, FNAME_LENGTH);
    size_t fname_len = strnlen(m->filename, FNAME_LENGTH - 1);
    if (fname_len > 0) memcpy(p, m->filename, fname_len);
    p += FNAME_LENGTH;
    memcpy(p, &payload_len_net, sizeof(payload_len_net)); p += sizeof(payload_len_net);
    // payload area: copy up to PAYLOAD_SIZE bytes, pad rest with zeros
    memset(p, 0, PAYLOAD_SIZE);
    if (m->payload_len > 0) memcpy(p, m->payload, m->payload_len);
    p += PAYLOAD_SIZE;
    return (size_t)(p - (uint8_t*)outbuf);
}

int message_deserialize(const void *inbuf, Message *m) {
    if (!inbuf || !m) return -1;
    const uint8_t *p = (const uint8_t*)inbuf;
    uint32_t opn_net, err_net; uint16_t payload_len_net;
    memcpy(&opn_net, p, sizeof(opn_net)); p += sizeof(opn_net);
    memcpy(&err_net, p, sizeof(err_net)); p += sizeof(err_net);
    memcpy(m->username, p, UNAME_LENGTH); p += UNAME_LENGTH;
    m->username[UNAME_LENGTH - 1] = '\0';
    memcpy(m->filename, p, FNAME_LENGTH); p += FNAME_LENGTH;
    m->filename[FNAME_LENGTH - 1] = '\0';
    memcpy(&payload_len_net, p, sizeof(payload_len_net)); p += sizeof(payload_len_net);
    memcpy(m->payload, p, PAYLOAD_SIZE); p += PAYLOAD_SIZE;

    m->opn = (Operation)ntohl(opn_net);
    m->err = (ErrorCode)ntohl(err_net);
    m->payload_len = ntohs(payload_len_net);
    return 0;
}
// END_TBC