// JavaScript source code


// VARIABLES
let val = "<div> Welcome to my site, <br /> Enjoy your stay. </div>"
var indexCounter = 0;
var indexCounter2 = 0;
let variable = "<br/>";
let maxTime = 200; // SPEED OF TEXT
let minTime = 1;

function $gel(id) {
    return document.getElementById(id);
}
function submit() {
    let value = $gel("textArea1").value
    $gel("firstPost").innerHTML = value;

    // Put create postable template
    $gel("firstPost").innerHTML =
        "Title: " + $gel("titleBox").value + "<br>" +
        "Date : " + $gel("DateBox").value + "<br>" +
        "Purpose : " + "<br>" + $gel("textArea1").value + "<br><br>" +
        "Signed, Foreandr";
}
function myFunction() {
    PrintString();
    
}
function PrintString(){
    temp = val[0 + indexCounter];  // stores current variable
    variable = variable + val[0 + indexCounter];
    $gel('Welcome').innerHTML = variable
    //console.log(variable);

    indexCounter += 1;

    if (indexCounter % 100 == 0) // Every hundred characters newline
    {
        document.write("<br>");
    }
    else if (indexCounter > val.length - 1) // Go over the end
    {
        return;
    }
    let timer = Math.floor((Math.random() * maxTime) + minTime); //500 IS GOOD TIMING

    //console.log(variable[-1]);
    if (temp == ".") { // Assigned period to the end
        sendOutHomepage();
    }

    setTimeout(PrintString, timer);

}

function sendOutHomepage() {
    $gel('Welcome2').innerHTML = "Change to this";
}






