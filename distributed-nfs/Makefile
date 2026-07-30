CC := gcc
CFLAGS := -D_GNU_SOURCE -Wall -Wextra -std=c11 -g
LDLIBS := -pthread

COMMON_SRCS := shared/nwutils.c shared/logging.c shared/error.c shared/parser.c

CLIENT_TARGET := client/client
CLIENT_SRCS := client/client.c $(COMMON_SRCS)

NM_TARGET := nameserver/nm
NM_SRCS := nameserver/nm.c nameserver/metadata.c $(COMMON_SRCS)

SS_TARGET := storageserver/ss
SS_SRCS := storageserver/ss.c $(COMMON_SRCS)

.PHONY: all client nm ss clean

all: client nm ss

client: $(CLIENT_TARGET)

nm: $(NM_TARGET)

ss: $(SS_TARGET)

$(CLIENT_TARGET): $(CLIENT_SRCS)
	$(CC) $(CFLAGS) $^ $(LDLIBS) -o $@

$(NM_TARGET): $(NM_SRCS)
	$(CC) $(CFLAGS) $^ $(LDLIBS) -o $@

$(SS_TARGET): $(SS_SRCS)
	$(CC) $(CFLAGS) $^ $(LDLIBS) -o $@

clean:
	rm -f $(CLIENT_TARGET) $(NM_TARGET) $(SS_TARGET)
	rm -f nm.log storageserver/.ss_registry
	rm -rf storageserver/server*
