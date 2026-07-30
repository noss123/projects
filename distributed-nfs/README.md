## Assumptions:-
the owner cannot remove read/write access from himself

if you want to insert a word between an existing word and a delimiter, currently you can't insert it with word index after you've placed the delimiter (the delimiter gets attached to the word); you'll have to open another WRITE operation to insert the word in the correct position in the sentence

removing access while another streams/reads/writes will not immediately revoke access, rather will let that command follow through before revoking access

deleting a file in the middle of another use write 