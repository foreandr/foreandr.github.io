

function printTitle() {
    var today = new Date();
    $gel("titleOfGraph").innerHTML = "<h4><u>Todays Date: " + today + "</u></h4>";
}
printTitle();
function $gel(id) {
    return document.getElementById(id);
}


file_ = "C:\Users\Andre\Desktop\FOLDER\foreandr.github.io\txt\file.txt"

/* DOESNT WORK 
async function loadFile(file) {
    let text = await file.text();
    document.getElementById('output').textContent = text;
}
*/
/* DOESNT WORK 
loadFile(file_)
*/