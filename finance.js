
function $gel(id) {
    return document.getElementById(id);
}

function printTitle() {
    var today = new Date();
    $gel("titleOfGraph").innerHTML = "<h4><u>Todays Date: " + today + "</u></h4>";
}
printTitle();
 
// DOESNT WORK
const fs = require('fs)');
file_ = "C:/Users/Andre/Desktop/FOLDER/foreandr.github.io/txt/file.txt";

fs.readFile(file_, 'utf-8', (err, data) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log(data);
});

