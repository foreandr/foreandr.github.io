var term = new Terminal();
term.open(document.getElementById('terminal'));
term.write('>');

var stringHolder;

/* coder:
 * purpose:

 */
function addToTerminal(stringOfText) {
    term.write(stringOfText);
}


/* coder:
 * purpose:

 */
function myKeyPress(e) {
    var keynum;

    if (window.event) { // IE                  
        keynum = e.keyCode;
    } else if (e.which) { // Netscape/Firefox/Opera                 
        keynum = e.which;
    }
    stringHolder = ((String.fromCharCode(keynum))); // ASCII TO STRING
    addToTerminal(stringHolder);
}


/* coder:
 * purpose:
 
 */
document.body.addEventListener("keydown", function (event) {
    term.write(String.fromCharCode(event.keyCode));
    if (event.keyCode == 13) {
        term.write("\n");
    }
    if (event.keyCode == 8) {
        term.write("Backspace");
            //console.log("backspace");
    }
    if (event.keyCode == 46) {
        term.write("delete");
    }
});