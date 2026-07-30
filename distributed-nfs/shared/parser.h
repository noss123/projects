#ifndef PARSER_H
#define PARSER_H

#include "shared.h"

// Sentence delimiters as per spec
#define DELIMITERS ".!?"

typedef struct WordNode {
    char *text;                // Heap-allocated word
    struct WordNode *prev;     // Previous word in sentence
    struct WordNode *next;     // Next word in sentence
    int is_delimiter;          // Non-zero if this node represents a delimiter token
} WordNode;

typedef struct SentenceNode {
    WordNode *head;            // First word in sentence
    WordNode *tail;            // Last word in sentence
    size_t word_count;         // Number of words
    char delimiter;            // '.', '!', '?', or '\0'
    pthread_mutex_t lock;      // Per-sentence mutex for WRITE operations
    struct SentenceNode *prev; // Previous sentence in document
    struct SentenceNode *next; // Next sentence in document
} SentenceNode;

typedef struct {
    SentenceNode *head;        // First sentence
    SentenceNode *tail;        // Last sentence
    size_t sentence_count;     // Total sentences
} ParsedFile;

// Parse text content into structured file (returns NULL on failure)
// Caller owns returned ParsedFile and must call free_parsed_file()
ParsedFile *parse_file_content(const char *content);

// Serialize parsed file back to text string (returns heap-allocated string)
// Caller must free() the returned string
char *serialize_parsed_file(const ParsedFile *pf);

int insert_word(ParsedFile *pf, size_t sentence_idx, size_t word_idx, const char *word_text);
int replace_word(ParsedFile *pf, size_t sentence_idx, size_t word_idx, const char *word_text);
int delete_word(ParsedFile *pf, size_t sentence_idx, size_t word_idx);

// Get word count across all sentences
size_t get_total_word_count(const ParsedFile *pf);

// Get character count (including spaces and delimiters)
size_t get_total_char_count(const ParsedFile *pf);

// Deep copy of ParsedFile (for UNDO support)
// Caller must call free_parsed_file() on returned copy
ParsedFile *copy_parsed_file(const ParsedFile *pf);

SentenceNode *parser_get_sentence(const ParsedFile *pf, size_t sentence_idx);
WordNode *sentence_get_word(const SentenceNode *sent, size_t word_idx);

int sentence_lock(SentenceNode *sent);
int sentence_unlock(SentenceNode *sent);

// Append a new empty sentence to the end of the ParsedFile.
// Returns pointer to the new sentence, or NULL on failure.
SentenceNode *parser_append_sentence(ParsedFile *pf);

void free_parsed_file(ParsedFile *pf);

int parser_split_sentences(ParsedFile *pf);
#endif // PARSER_H
