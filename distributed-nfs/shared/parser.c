#include "parser.h"
#include <ctype.h>

static int is_delimiter(char c) {
	return c == '.' || c == '!' || c == '?';
}

static int is_whitespace(char c) {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

static WordNode *word_create_with_flag(const char *text, int is_delim) {
    WordNode *node = calloc(1, sizeof(WordNode));
    if (!node) return NULL;
    node->text = strdup(text ? text : "");
    if (!node->text) {
        free(node);
        return NULL;
    }
    node->is_delimiter = is_delim ? 1 : 0;
    return node;
}

static WordNode *word_create(const char *text) {
    return word_create_with_flag(text, 0);
}

static void word_free_list(WordNode *node) {
	while (node) {
		WordNode *next = node->next;
		free(node->text);
		free(node);
		node = next;
	}
}

static void sentence_detach_word_no_free(SentenceNode *sent, WordNode *word) {
    if (!sent || !word) return;
    if (word->prev) word->prev->next = word->next;
    else sent->head = word->next;
    if (word->next) word->next->prev = word->prev;
    else sent->tail = word->prev;
    word->prev = word->next = NULL;
    if (!word->is_delimiter && sent->word_count > 0) sent->word_count--;
}

static void sentence_recount_words(SentenceNode *sent) {
    if (!sent) return;
    size_t count = 0;
    WordNode *node = sent->head;
    while (node) {
        if (!node->is_delimiter) count++;
        node = node->next;
    }
    sent->word_count = count;
}

static SentenceNode *sentence_create(void) {
	SentenceNode *sent = calloc(1, sizeof(SentenceNode));
	if (!sent) return NULL;
	pthread_mutex_init(&sent->lock, NULL);
	return sent;
}

static void sentence_free_list(SentenceNode *sent) {
	while (sent) {
		SentenceNode *next = sent->next;
		word_free_list(sent->head);
		pthread_mutex_destroy(&sent->lock);
		free(sent);
		sent = next;
	}
}

ParsedFile *parse_file_content(const char *content) {
    if (!content) return NULL;
    ParsedFile *pf = calloc(1, sizeof(ParsedFile));
    if (!pf) return NULL;

    SentenceNode *current = sentence_create();
    if (!current) {
        free(pf);
        return NULL;
    }
    pf->head = pf->tail = current;
    pf->sentence_count = 1;

    const char *p = content;
    while (*p) {
        if (is_whitespace(*p)) {
            p++;
            continue;
        }
        if (is_delimiter(*p)) {
            current->delimiter = *p++;
            SentenceNode *next_sent = sentence_create();
            if (!next_sent) {
                sentence_free_list(pf->head);
                free(pf);
                return NULL;
            }
            current->next = next_sent;
            next_sent->prev = current;
            current = next_sent;
            pf->tail = current;
            pf->sentence_count++;
            continue;
        }
        const char *start = p;
        while (*p && !is_whitespace(*p) && !is_delimiter(*p)) p++;
        size_t len = (size_t)(p - start);
        if (len == 0) continue;
        char *chunk = strndup(start, len);
        if (!chunk) {
            sentence_free_list(pf->head);
            free(pf);
            return NULL;
        }
        WordNode *node = word_create(chunk);
        free(chunk);
        if (!node) {
            sentence_free_list(pf->head);
            free(pf);
            return NULL;
        }
        if (!current->head) current->head = node;
        if (current->tail) {
            node->prev = current->tail;
            current->tail->next = node;
        }
        current->tail = node;
        current->word_count++;
    }
    if (pf->tail && !pf->tail->head && pf->tail->delimiter == '\0' && pf->sentence_count > 1) {
        SentenceNode *empty = pf->tail;
        pf->tail = empty->prev;
        if (pf->tail) pf->tail->next = NULL;
        pthread_mutex_destroy(&empty->lock);
        free(empty);
        pf->sentence_count--;
    }
    return pf;
}

SentenceNode *parser_append_sentence(ParsedFile *pf) {
    if (!pf) return NULL;
    SentenceNode *node = sentence_create();
    if (!node) return NULL;
    if (!pf->head) {
        pf->head = pf->tail = node;
    } else {
        node->prev = pf->tail;
        if (pf->tail) {
            pf->tail->next = node;
        }
        pf->tail = node;
    }
    pf->sentence_count++;
    return node;
}

// Serialize parsed file back to text
char *serialize_parsed_file(const ParsedFile *pf) {
    if (!pf) return NULL;
    size_t cap = 4096;
    char *buf = malloc(cap);
    if (!buf) return NULL;
    buf[0] = '\0';
    size_t len = 0;

    SentenceNode *sent = pf->head;
    while (sent) {
        WordNode *word = sent->head;
        while (word) {
            size_t wlen = strlen(word->text);
            if ((sent != pf->head || word != sent->head) && len + 1 >= cap) {
                cap *= 2;
                char *nb = realloc(buf, cap);
                if (!nb) {
                    free(buf);
                    return NULL;
                }
                buf = nb;
            }
            if (sent != pf->head || word != sent->head) buf[len++] = ' ';
            if (len + wlen >= cap) {
                while (len + wlen >= cap) cap *= 2;
                char *nb = realloc(buf, cap);
                if (!nb) {
                    free(buf);
                    return NULL;
                }
                buf = nb;
            }
            memcpy(buf + len, word->text, wlen);
            len += wlen;
            word = word->next;
        }
        if (sent->delimiter) {
            if (len + 1 >= cap) {
                cap *= 2;
                char *nb = realloc(buf, cap);
                if (!nb) {
                    free(buf);
                    return NULL;
                }
                buf = nb;
            }
            buf[len++] = sent->delimiter;
        }
        sent = sent->next;
    }
    buf[len] = '\0';
    return buf;
}

// Insert word at sentence[sentence_idx].words[word_idx]
static SentenceNode *parser_get_sentence_internal(const ParsedFile *pf, size_t idx) {
    SentenceNode *sent = pf->head;
    while (sent && idx--) sent = sent->next;
    return sent;
}

SentenceNode *parser_get_sentence(const ParsedFile *pf, size_t sentence_idx) {
    if (!pf || sentence_idx >= pf->sentence_count) return NULL;
    return parser_get_sentence_internal(pf, sentence_idx);
}

WordNode *sentence_get_word(const SentenceNode *sent, size_t word_idx) {
    if (!sent || word_idx >= sent->word_count) return NULL;
    WordNode *word = sent->head;
    while (word) {
        if (!word->is_delimiter) {
            if (word_idx == 0) return word;
            word_idx--;
        }
        word = word->next;
    }
    return NULL;
}

int sentence_lock(SentenceNode *sent) {
    return sent ? pthread_mutex_lock(&sent->lock) : -1;
}

int sentence_unlock(SentenceNode *sent) {
    return sent ? pthread_mutex_unlock(&sent->lock) : -1;
}

static WordNode *sentence_find_insert_pos(SentenceNode *sent, size_t word_idx, int *append_at_end) {
    if (!sent) return NULL;
    if (append_at_end) *append_at_end = 0;
    if (word_idx == sent->word_count) {
        if (append_at_end) *append_at_end = 1;
        return NULL;
    }
    WordNode *node = sent->head;
    while (node) {
        if (!node->is_delimiter) {
            if (word_idx == 0) return node;
            word_idx--;
        }
        node = node->next;
    }
    return NULL;
}

static void sentence_insert_between(SentenceNode *sent, WordNode *node, WordNode *prev, WordNode *next) {
    if (!sent || !node) return;
    node->prev = prev;
    node->next = next;
    if (prev) prev->next = node;
    else sent->head = node;
    if (next) next->prev = node;
    else sent->tail = node;
}

int insert_word(ParsedFile *pf, size_t sentence_idx, size_t word_idx, const char *word_text) {
    if (!pf || !word_text) return -1;
    SentenceNode *sent = parser_get_sentence(pf, sentence_idx);
    if (!sent) return -1;
    if (word_idx > sent->word_count) return -1;

    int append = 0;
    WordNode *insert_before = sentence_find_insert_pos(sent, word_idx, &append);
    WordNode *prev = append ? sent->tail : (insert_before ? insert_before->prev : NULL);
    const char *p = word_text;
    while (*p) {
        while (*p && is_whitespace(*p)) p++;
        if (!*p) break;
        const char *start = p;
        int is_delim_token = 0;
        size_t len = 0;
        if (is_delimiter(*p)) {
            is_delim_token = 1;
            len = 1;
            p++;
        } else {
            while (*p && !is_whitespace(*p) && !is_delimiter(*p)) {
                p++;
                len++;
            }
        }
        if (len == 0) continue;
        char *chunk = strndup(start, len);
        if (!chunk) return -1;
        WordNode *node = word_create_with_flag(chunk, is_delim_token);
        free(chunk);
        if (!node) return -1;
        sentence_insert_between(sent, node, prev, insert_before);
        prev = node;
        if (!node->is_delimiter) {
            sent->word_count++;
            word_idx++;
        }
    }
    return 0;
}

int replace_word(ParsedFile *pf, size_t sentence_idx, size_t word_idx, const char *word_text) {
    if (!pf || !word_text) return -1;
    SentenceNode *sent = parser_get_sentence(pf, sentence_idx);
    if (!sent) return -1;
    WordNode *word = sentence_get_word(sent, word_idx);
    if (!word) return -1;

    int needs_split = 0;
    for (const char *p = word_text; *p; ++p) {
        if (is_delimiter(*p)) {
            needs_split = 1;
            break;
        }
    }

    if (needs_split) {
        free(word->text);
        sentence_detach_word_no_free(sent, word);
        free(word);
        return insert_word(pf, sentence_idx, word_idx, word_text);
    }

    char *new_text = strdup(word_text);
    if (!new_text) return -1;
    free(word->text);
    word->text = new_text;
    return 0;
}

// Delete word
int delete_word(ParsedFile *pf, size_t sentence_idx, size_t word_idx) {
    if (!pf) return -1;
    SentenceNode *sent = parser_get_sentence(pf, sentence_idx);
    if (!sent) return -1;
    WordNode *word = sentence_get_word(sent, word_idx);
    if (!word) return -1;
    int was_delimiter = word->is_delimiter;
    if (word->prev) word->prev->next = word->next;
    else sent->head = word->next;
    if (word->next) word->next->prev = word->prev;
    else sent->tail = word->prev;
    free(word->text);
    free(word);
    if (!was_delimiter && sent->word_count > 0) {
        sent->word_count--;
    }
    if (sent->word_count == 0) {
        if (sent->prev) sent->prev->next = sent->next;
        else pf->head = sent->next;
        if (sent->next) sent->next->prev = sent->prev;
        else pf->tail = sent->prev;
        pthread_mutex_destroy(&sent->lock);
        free(sent);
        pf->sentence_count--;
    }
    return 0;
}

// Get total word count
size_t get_total_word_count(const ParsedFile *pf) {
    if (!pf) return 0;
    size_t total = 0;
    SentenceNode *sent = pf->head;
    while (sent) {
        total += sent->word_count;
        sent = sent->next;
    }
    return total;
}

// Get total character count
size_t get_total_char_count(const ParsedFile *pf) {
    if (!pf) return 0;
    size_t total = 0;
    SentenceNode *sent = pf->head;
    while (sent) {
        WordNode *word = sent->head;
        while (word) {
            total += strlen(word->text);
            if (sent != pf->head || word != sent->head) total++;
            word = word->next;
        }
        if (sent->delimiter) total++;
        sent = sent->next;
    }
    return total;
}

// Deep copy
ParsedFile *copy_parsed_file(const ParsedFile *pf) {
    if (!pf) return NULL;
    ParsedFile *copy = calloc(1, sizeof(ParsedFile));
    if (!copy) return NULL;
    SentenceNode *src_sent = pf->head;
    while (src_sent) {
        SentenceNode *dst_sent = sentence_create();
        if (!dst_sent) {
            free_parsed_file(copy);
            return NULL;
        }
        dst_sent->delimiter = src_sent->delimiter;
        dst_sent->word_count = src_sent->word_count;
        if (!copy->head) copy->head = copy->tail = dst_sent;
        else {
            dst_sent->prev = copy->tail;
            copy->tail->next = dst_sent;
            copy->tail = dst_sent;
        }
        copy->sentence_count++;

        WordNode *src_word = src_sent->head;
        while (src_word) {
            WordNode *dst_word = word_create_with_flag(src_word->text, src_word->is_delimiter);
            if (!dst_word) {
                free_parsed_file(copy);
                return NULL;
            }
            if (!dst_sent->head) dst_sent->head = dst_sent->tail = dst_word;
            else {
                dst_word->prev = dst_sent->tail;
                dst_sent->tail->next = dst_word;
                dst_sent->tail = dst_word;
            }
            src_word = src_word->next;
        }
        src_sent = src_sent->next;
    }
    return copy;
}

// Free parsed file
void free_parsed_file(ParsedFile *pf) {
    if (!pf) return;
    sentence_free_list(pf->head);
    free(pf);
}

int parser_split_sentences(ParsedFile *pf) {
    if (!pf) return -1;
    SentenceNode *sent = pf->head;
    while (sent) {
        WordNode *node = sent->head;
        WordNode *delimiter_node = NULL;
        while (node) {
            if (node->is_delimiter) {
                delimiter_node = node;
                break;
            }
            node = node->next;
        }
        if (!delimiter_node) {
            sent = sent->next;
            continue;
        }
        char inherited_delim = sent->delimiter;
        char delim_char = (delimiter_node->text && delimiter_node->text[0]) ? delimiter_node->text[0] : '.';
        WordNode *right_head = delimiter_node->next;
        WordNode *left_tail = delimiter_node->prev;
        if (left_tail) {
            left_tail->next = NULL;
            sent->tail = left_tail;
        } else {
            sent->head = NULL;
            sent->tail = NULL;
        }
        if (right_head) right_head->prev = NULL;
        free(delimiter_node->text);
        free(delimiter_node);
        sent->delimiter = delim_char;
        sentence_recount_words(sent);
        if (right_head) {
            SentenceNode *new_sent = sentence_create();
            if (!new_sent) return -1;
            new_sent->head = right_head;
            WordNode *tail = right_head;
            while (tail && tail->next) {
                tail = tail->next;
            }
            new_sent->tail = tail;
            sentence_recount_words(new_sent);
            new_sent->delimiter = inherited_delim;
            new_sent->next = sent->next;
            if (sent->next) sent->next->prev = new_sent;
            sent->next = new_sent;
            new_sent->prev = sent;
            if (pf->tail == sent) pf->tail = new_sent;
            pf->sentence_count++;
        }
        sent = sent->next;
    }
    return 0;
}
