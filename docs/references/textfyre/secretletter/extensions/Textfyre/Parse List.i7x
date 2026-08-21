Parse List by Textfyre begins here.

Definition: a direction is matched by the parser if it fits the parse list. 
Definition: a room is matched by the parser if it fits the parse list. 
Definition: a thing is matched by the parser if it fits the parse list. 

To decide whether (N - an object) fits the parse list: 
    (- (FindInParseList({N})) -) 


Include (- 
[ FindInParseList obj i k marker; 
    marker = 0; 
    for (i=1 : i<=number_of_classes : i++) { 
    while (((match_classes-->marker) ~= i) && ((match_classes-->marker) ~= -i)) marker++; 
    k = match_list-->marker; 
    if (k==obj) rtrue; 
    } 
    rfalse; 
]; 
-) 

Parse List ends here.
