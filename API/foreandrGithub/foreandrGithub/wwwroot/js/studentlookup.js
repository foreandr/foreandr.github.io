$(function () {
    $("#getbutton").click(async (e) => {
        try {
            let firstname = $("#TextBoxFirstname").val();
            $("#status").text("please wait...");
            let response = await fetch(`/api/writer/${firstname}`); // FETCH API
            if (response.ok) {
                let data = await response.json();
                console.log(data);
                if (data.firstname !== "not found") {
                    $("#firstname").text(data.firstname);
                    $("#lastname").text(data.lastname);
                    $("#dateofbirth").text(data.dateOfbirth);
                    $("#country").text(data.country);
                    $("#status").text("student found");
                }
                else {
                    $("#firstname").text(data.firstname);
                    $("#lastname").text(data.lastname);
                    $("#dateofbirth").text(data.dateOfbirth);
                    $("#country").text(data.country);
                    $("#status").text("no such student");
                }
            } else if (response.status !== 404) {
                let problemJson = await response.json();
                errorRtn(problemJson, response.status);
            }
            else {
                $("#status").text("no such path on server");
            }
        }
        catch (error) {
            $("#status").text(error.message);
        }
    });// click event
    //console.log("hello");
});//jquery method

const errorRtn = (problemJson, status) => {
    if (status > 499) {
        $("#status").text("Problem server side, see debug console");
    } else {
        let keys = Object.keys(problemJson.errors)
        problem = {
            status: status,
            statusText: problemJson.errors[keys[0]][0],
        };
        $("#status").text("Problem client side, see broswer console");
        console.log(problem);
    }
}

