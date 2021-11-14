var term = new Terminal();
term.open(document.getElementById('terminal'));
term.write('Hello Again');
document.addEventListener("keydown", KeyCheck);  //or however you are calling your method
var stringHolder;


function addToTerminal(stringOfText) {
    term.write(stringOfText);
}

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


function KeyCheck(event) {
    var KeyID = event.keyCode;
    switch (KeyID) {
        case 8:
            term.write("Backspace");
            //console.log("backspace");
            break;
        case 46:
            term.write("delete");
            //console.log("delete");
            break;
        default:
            break;
    }
}
