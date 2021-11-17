function printTitle() {
    var today = new Date();
    $gel("titleOfGraph").innerHTML = "<h4><u>Todays Date: " + today + "</u></h4>";
}
printTitle();

var myVar2 = require('./papaparse') //to use local modules
file = "C:\Users\Andre\Desktop\FOLDER\foreandr.github.io\csv\file.csv"


/*
Papa.parse(file, {
    complete: function (results) {
        console.log(results);
    }
});
 */ 
function $gel(id) {
    return document.getElementById(id);
}





//console.log("hello");
