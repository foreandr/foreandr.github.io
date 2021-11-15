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


/* coder: andre
 * purpose: take in a key, assign this key to a value, print to console

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


/* coder: andre
 * purpose: 
 * notes: I can't figure this out
 
 */
let totalString = "";
let forBackspace = "";
document.body.addEventListener("keydown", function (event) {
    // console.log(event); GET FULL OBJECT


    if (event.keyCode == 13) { // ENTER KEY
        term.write("\n");
        totalString += "\n";

    }
    if (event.keyCode == 8) { //BACKSPACE

        term.write("Backspace");
        //totalString += ("/");
        for (let i = 0; i < totalString.length - 1; i++) { // NOT SURE WHY MINUS 2
            forBackspace += totalString[i];
            //console.log("Being Added[i]" + forBackspace[i]);
            //console.log("Total string[i]" + totalString[i]);
        }

        console.log("Total for backspace string " + forBackspace);
    }
    if (event.keyCode == 46) { // DELETE
        term.write("delete");
        totalString += "delete";
    }
    if (event.keyCode == 189) { // DELETE
        term.write("-");
        totalString += "-";
    }

    else { // PRINT WHATEVER ELSE THERE IS
        totalString += String.fromCharCode(event.keyCode);
        term.write(String.fromCharCode(event.keyCode));
    }

    //console.log(totalString);
});