#ifndef SHARED_H
#define SHARED_H

// includes
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <errno.h>
#include <pthread.h>
#include <time.h>
#include <dirent.h>
#include <sys/stat.h>
#include <linux/limits.h>       // for PATH_MAX
#include <ctype.h>

// definitions
#define UNAME_LENGTH 64
#define FNAME_LENGTH 128
#define SS_ID_LENGTH 64

typedef enum Operation { 
    NONE = 0,
    VIEW = 1,
    READ = 2,
    CREATE = 3,
    WRITE = 4,
    UNDO = 5,
    INFO = 6,
    DELETE = 7,
    STREAM = 8,
    LIST = 9,
    ADDACCESS = 10,
    REMACCESS = 11,
    EXEC = 12
} Operation;


#endif