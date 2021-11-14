var term = new Terminal();
term.open(document.getElementById('terminal'));
term.write('Hello Again');
var countInside = 0;

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

    let string = ((String.fromCharCode(keynum)));
    console.log(string);
    addToTerminal(string);
}
