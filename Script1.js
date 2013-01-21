// JavaScript source code
// use the JSLint button above to check your JS code!
//What each index in a row from comments.csv represent
var COMMENT_INDEX = {
    name: 0,
    email: 1,
    document: 2,
    annotationID: 3,
    documentID: 4,
    userID: 5,
    commentText: 6,
    commentArea: 7,
    commentPositivity: 8,
    commentTime: 9,
    replyTo: 10,
    annotationParagraphID: 11,
    annotationID1: 12,
    paragraphID: 13,
    startChar: 14,
    endChar: 15,
    annotationText: 16,
    salonID: 17
};

//What each index in a row from responses.csv represent
var RESPONSE_INDEX = {
    name: 0,
    email: 1,
    document: 2,
    question: 3,
    response: 4,
    stance: 5,
    created: 6,
    modified: 7,
    documentID: 8,
    questioID: 0,
    responseID: 10,
    userID: 11
};

var Cdata = {};
var Rdata = {};

var CsvParser = function(rowHandlers) {
    // variables used in the parser
    var isHeader;
    var header;
    var headerEndIndex;
    var quotes;
    var currentLine;
    var currentElement;
    var inElement;
    var headerSize;

    // parsedData saves all the processed data
    var parsedData;

    // accessor
    var getParsedData = function () {
        return parsedData;
    };

    // once you have a whole row, call this
    var handleRow = function(row) {
        for (var i in rowHandlers) {
            var rowHandler = rowHandlers[i];
            rowHandler.call(parsedData, row);
        }
    }

    // call this for each chunk
    var parse = function(chunk) {
        //First reads the header
        if (isHeader) {
            for (var i = 0; i < chunk.length && isHeader; i++) {
                var currentChar = chunk.charAt(i);
                switch (currentChar) {
                    case '\"':
                        break;

                    case '\n':
                        // I am assuming that the newline 
                        //character represents the end of the header
                        isHeader = false;
                        /* need headerEndIndex in case the 
                         * 256 characters is contain the header
                         * and the next row
                         */
                        headerEndIndex = i + 1;
                        currentElement = "";
                        break;

                    case ',':
                        //Check if each comma comes after a "
                        // I assume this for only the headers...
                        if (chunk.charAt(i - 1) != '\"') {
                            console.log("ERROR IN HEADER");
                            return;
                        }
                        header.push(currentElement);
                        headerSize++;
                        currentElement = "";
                        break;

                    default:
                        currentElement += currentChar;
                        break;
                }
            }
        }
        //Begin to read the rest of the file
        if (!isHeader) {
            for (var i = headerEndIndex; i < chunk.length; i++) {
                var currentChar = chunk.charAt(i);
                switch (currentChar) {
                    case '\"':
                        quotes++;
                        if (quotes == 1) { //First entering an element (or cell?)
                            inElement = true;
                        } else if (quotes % 2 == 0) { //If even number of "s out of element
                            inElement = false;
                        } else { //If odd number of "s, the " is in one of the elements
                            inElement = true;
                            currentElement += '\"';
                        }
                        break;

                    case ',':
                        if (inElement) { //If inElement, then we treat the ',' as a character in the element
                            currentElement += ',';
                            break;
                        } else if (currentLine.length < headerSize - 1) {
                            //Cases when we have not read all the cells in a "row"
                            currentLine.push(currentElement);
                            currentElement = '';
                            quotes = 0;
                            inElement = false;
                        } else {
                            //When we have read all the cells in a row
                            currentLine.push(currentElement);
                            currentElement = '';
                            //console.log(currentLine);
                            handleRow(currentLine);
                            currentLine = [];
                            quotes = 0;
                        }
                        break;

                    default:
                        //case for any non-significant(?) characters
                        if (inElement) currentElement += currentChar;
                        break;
                }
            }
            headerEndIndex = 0;
        }
    };

    // initialize all your data sources, etc. here
    var init = function() {
        isHeader = true;
        header = [];
        headerEndIndex = 0;
        quotes = 0;
        currentLine = [];
        currentElement = '';
        inElement = false;
        headerSize = 0;
        parsedData = {
            g: {},
            //Grades
            d: {},
            //Details
            q: {}, //Questions (only for comments.csv)
            name: {},
            doc: {},
            doc2: {}
        };
    };

    return {
        init: init,
        parse: parse,
        getParsedData: getParsedData
    };
};

//Creates a mapping from name to usrID
function CaddName(row) {
    if (!(row[COMMENT_INDEX.name] in this.name)) {
        this.name[row[COMMENT_INDEX.name]] = row[COMMENT_INDEX.userID];
    }
}

//Creates a mapping from name to usrID
function RaddName(row) {
    if (this.name[row[RESPONSE_INDEX.name]] == null) {
        this.name[row[RESPONSE_INDEX.name]] = row[RESPONSE_INDEX.userID];
    }
}

//Creates a mapping from document to docID and docID to document
function CaddDocument(row) {
    if (this.doc[row[COMMENT_INDEX.document]] == null) {
        this.doc[row[COMMENT_INDEX.document]] = row[COMMENT_INDEX.documentID];
    }
    if (this.doc2[row[COMMENT_INDEX.documentID]] == null) {
        this.doc2[row[COMMENT_INDEX.documentID]] = row[COMMENT_INDEX.document];
    }
}

//Creates a mapping from document to docID and docID to document
function RaddDocument(row) {
    if (this.doc[row[RESPONSE_INDEX.document]] == null) {
        this.doc[row[RESPONSE_INDEX.document]] = row[RESPONSE_INDEX.documentID];
    }
    if (this.doc2[row[RESPONSE_INDEX.documentID]] == null) {
        this.doc2[row[RESPONSE_INDEX.documentID]] = row[RESPONSE_INDEX.document];
    }
}

//Creates a hashtable of stats for each student
function comment_grades(row) {
    //Set the key for hashing as the userID
    var key = row[COMMENT_INDEX.userID];

    //Add person if not already in hash
    if (this.g[key] == null) {
        var value = {
            n: row[COMMENT_INDEX.name],
            e: row[COMMENT_INDEX.email].toLowerCase(),
            c: [],
            q: [],
            a: {tc: 0,
                tcl: 0,
                tq: 0,
                tql: 0,
                tr: 0,
                dates: []
               },
            d: {}

        };
        this.g[key] = value;
    }

    //Add to the stats only if the comment length is greater than 0
    if (row[COMMENT_INDEX.commentText].length > 0) {

        this.g[key].c.push(row[COMMENT_INDEX.commentText].split(' ').length);

        //Get current value in the hashtable
        var value = this.g[key].a;
        //Update values
        value.tc++;
        value.tcl += row[COMMENT_INDEX.commentText].split(' ').length;
        value.dates.push(row[COMMENT_INDEX.commentTime]);
        if (row[COMMENT_INDEX.commentText].indexOf('?') != -1) {
            value.tq++;
            value.tql += row[COMMENT_INDEX.commentText].split(' ').length;
        }
        if (row[COMMENT_INDEX.replyTo] > 0) value.tr++;

        //this.g[key].a = value;

        if (this.g[key].d[row[COMMENT_INDEX.documentID]] == null) {
            var newDoc = {
                tc: 0,
                tcl: 0,
                tq: 0,
                tql: 0,
                tr: 0,
                dates: []
            };
            this.g[key].d[row[COMMENT_INDEX.documentID]] = newDoc;
        }

        var document = row[COMMENT_INDEX.documentID];
        var docValue = this.g[key].d[document];
        //Update values
        docValue.tc++;
        docValue.tcl += row[COMMENT_INDEX.commentText].split(' ').length;
        docValue.dates.push(row[COMMENT_INDEX.commentTime]);
        if (row[COMMENT_INDEX.commentText].indexOf('?') != -1) {
            docValue.tq++;
            docValue.tql += row[COMMENT_INDEX.commentText].split(' ').length;
            this.g[key].q.push(row[COMMENT_INDEX.commentText].split(' ').length);
        }
        if (row[COMMENT_INDEX.replyTo] > 0) docValue.tr++;

        //this.g[key][document] = docValue;

    }
}

//Creates a hashtable of comments for each student
function comment_details(row) {
    var key = row[COMMENT_INDEX.userID];

    //if the student is not in the table, add him/her
    if (this.d[key] == null) {
        this.d[key] = [];
    }

    if (row[COMMENT_INDEX.commentText].length > 0) {
        var value = this.d[key];
        value.push({
            name: row[COMMENT_INDEX.name],
            email: row[COMMENT_INDEX.email].toLowerCase(),
            comment: row[COMMENT_INDEX.commentText],
            selection: row[COMMENT_INDEX.annotationText],
            document: row[COMMENT_INDEX.document],
            documentID: row[COMMENT_INDEX.documentID]
        });
        this.d[key] = value;
    }
}

//Creates a hashtable of questions for each student
function comment_questions(row) {
    var key = row[COMMENT_INDEX.userID];

    if (this.q[key] == null) {
        this.q[key] = [];
    }
    if (row[COMMENT_INDEX.commentText].length > 0 && row[COMMENT_INDEX.commentText].indexOf('?') != -1) {
        var value = this.q[key];
        value.push({
            name: row[COMMENT_INDEX.name],
            email: row[COMMENT_INDEX.email].toLowerCase(),
            question: row[COMMENT_INDEX.commentText],
            selection: row[COMMENT_INDEX.annotationText],
            document: row[COMMENT_INDEX.document],
            documentID: row[COMMENT_INDEX.documentID]
        });
        this.q[key] = value;
    }
}

//Creates a hashtable of stats for each student
function response_grades(row) {
    var key = row[RESPONSE_INDEX.userID];
    if (this.g[key] == null) {
        var value = {
            n: row[RESPONSE_INDEX.name],
            e: row[RESPONSE_INDEX.email].toLowerCase(),
            r: [],
            a: { tr: 0, trl: 0, dates: [] },
            d: {}
        };
        this.g[key] = value;
    }
    if (row[RESPONSE_INDEX.response].length > 0) {
        this.g[key].r.push(row[RESPONSE_INDEX.response].split(' ').length);
        var value = this.g[key];
        value.a.tr++;
        value.a.trl += row[RESPONSE_INDEX.response].split(' ').length;
        value.a.dates.push(row[RESPONSE_INDEX.created]);
        //this.g[key] = value;

        if (this.g[key].d[row[RESPONSE_INDEX.documentID]] == null) {
            var newDoc = { tr: 0, trl: 0, dates: [] };
            this.g[key].d[row[RESPONSE_INDEX.documentID]] = newDoc;
        }

        var document = row[RESPONSE_INDEX.documentID];
        var docValue = this.g[key].d[document];
        //Update values
        docValue.tr++;
        docValue.trl += row[RESPONSE_INDEX.response].split(' ').length;
        docValue.dates.push(row[RESPONSE_INDEX.created]);

        this.g[key].d[document] = docValue;

    }
}

//Creates a hashtable of responses for each student
function response_details(row) {
    var key = row[RESPONSE_INDEX.userID];

    if (this.d[key] == null) {
        this.d[key] = [];
    }
    if (row[RESPONSE_INDEX.response].length > 0) {
        var value = this.d[key];
        value.push({
            name: row[COMMENT_INDEX.name],
            email: row[COMMENT_INDEX.email].toLowerCase(),
            question: row[RESPONSE_INDEX.question],
            response: row[RESPONSE_INDEX.response],
            document: row[RESPONSE_INDEX.document],
            documentID: row[RESPONSE_INDEX.documentID]
        });
        this.q[key] = value;
    }
}

// obviously don't declare all the functions inline
var RowHandlers = {
    comments: [CaddName, CaddDocument, comment_grades, comment_details,
               comment_questions],
    responses: [RaddName, RaddDocument, response_details, response_grades]
};

var Parsers = {
    comments: CsvParser(RowHandlers.comments),
    responses: CsvParser(RowHandlers.responses)
};

//Given an array of date strings, parses and formats them
function parseDates(dates) {
    var formattedDates = [];

    dates.forEach(function (date) {
        var day;
        var month;
        var year;

        var split1 = date.split("/", 3);
        month = split1[0];
        day = split1[1];
        //console.log(split1)
        var split2 = split1[2].split(" ", 1);
        year = split2[0];
        formattedDates.push(Date.UTC(year, (month-1), day));
        //console.log(month,day,year);

    });

    return formattedDates;
}

//Given an array of formattedDates, counts the number of times each date occurs
function getOccurances(arr) {
    var a = [], b = [], prev;

    arr.sort();
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] !== prev) {
            a.push(arr[i]);
            b.push(1);
        } else {
            b[b.length - 1]++;
        }
        prev = arr[i];
    }
    return [a, b];
}

//Saves the Graph Data for the whole class for later use
var CwholeClass;
var RwholeClass;

//Given an array of dates, prints out the corresponding graphs to the webpage
function prnt_graph(dates, dest, subtitle) {
    var formattedDates = parseDates(dates);
    var d = getOccurances(formattedDates);
    var finalDates = [];
    var i = 0;
    var series;
    var renderTo;

    for (i; i < d[0].length; i++) {
        finalDates.push([d[0][i], d[1][i]]);
    }

    //console.log((finalDates));
    var numOfcomments = dates.length;

    var title, yAxis, tooltip;
    if (dest[0] == 'C') {
        title = 'Comment Activity';
        yAxis = 'Number of Comments';
        tooltip = ' comment(s)';
        renderTo = 'CsumGraph';

        if (dest == 'Csum') {
            CwholeClass = { name: subtitle, data: finalDates };
            series = [CwholeClass];
        } else if (dest == 'CInd') {
            series = [CwholeClass, { name: subtitle, data: finalDates }];
        } else if (dest == 'Cdoc') {
            series = [CwholeClass, { name: subtitle, data: finalDates }];
        }
    } else {
        title = 'Response Activity';
        yAxis = 'Number of Responses';
        tooltip = ' response(s)';
        renderTo = 'RsumGraph';

        if (dest == 'Rsum') {
            RwholeClass = { name: subtitle, data: finalDates };
            series = [RwholeClass];
        } else if (dest == 'RInd') {
            series = [RwholeClass, { name: subtitle, data: finalDates }];
        } else if (dest == 'Rdoc') {
            series = [RwholeClass, { name: subtitle, data: finalDates }];
        }
    }
        
    //Output the Graph
    $(document).ready(function () {
        chart = new Highcharts.Chart({
            chart: {
                renderTo: renderTo,
                type: 'line'
            },
            title: {
                text: title
            },
            subtitle: {
                text: subtitle
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { 
                    month: '%e. %b',
                    year: '%b'
                }
            },
            yAxis: {
                title: {
                    text: yAxis
                },
                min: 0
            },
            tooltip: {
                formatter: function () {
                    return ('<b>' + this.series.name + '</b><br/>' +
                    Highcharts.dateFormat('%e. %b', this.x) + ': ' +
                    this.y + ' comment(s)');
                }
            },
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: true
                    },
                    enableMouseTracking: true
                }
            },
            series: series
        });
    });

}

//Outputs the processed data onto the page
function prnt_comments(comments, prntProgress, docID, isName, isSearch) {
    //Open up the correct tabs
    $('.onlyOneDisabledTab').removeAttr('disabled');
    $("#cb").attr('disabled', 'disabled');
    $("#outputComments").show();
    $(".onlyOneVisibleTab").hide();

    //If user is searching, open the details tab. Else open the Glance tab
    if (isSearch) {
        $("#cdt").attr('disabled', 'disabled');
        $("#commentDetails").show();
    } else {
        $("#cgl").attr('disabled', 'disabled');
        $("#commentGlance").show();
    }

    //prntProgress indicates that we are printing for the first time
    if (prntProgress) {
        //output the progress
        $('#comProgress').append("<br/>Printing Grades....");

        //Add to the Name dropdown
        $('#cName').html('<option>Name</option>');
        var names = [];
        for (name in comments.name) {
            names.push(name);
        }
        names.sort(
            function (a, b) {
                if (a.toLowerCase().replace(/\s/g, "") < b.toLowerCase().replace(/\s/g, "")) return -1;
                if (a.toLowerCase().replace(/\s/g, "") > b.toLowerCase().replace(/\s/g, "")) return 1;
                return 0;
            });

        for (i = 0; i < names.length; i++) {
            $('#cName').append('<option>' + names[i] + '</option>');
        }

        //Add to the Document dropdown
        $('#cDocument').html('<option>Document</option>');
        var docs = [];
        for (doc in comments.doc) {
            docs.push(doc);
        }
        docs.sort(
            function (a, b) {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
            });

        for (i = 0; i < docs.length; i++) {
            $('#cDocument').append('<option>' + docs[i] + '</option>');
        }

    }

    //Remove individual Stats if not Name
    if (!isName) {
        $('#CIndStats').html('');
        $('#commentGlance').height(650);
    }

    //OUTPUTTING GLANCE TAB
    //Note that we don't modify this here if we are outputting a 
    //specific person or searching something.
    if (!isName && !isSearch) {
        //Finds the array of Dates to draw the graph
        //And also calculates general Stats
        var dates = [];
        var cmts = [];
        var totalComments = 0;
        var totalCommentLength = 0;
        var totalQuestions = 0;
        var totalQuestionLength = 0;
        var totalReplies = 0;
        var numUser = Object.keys(comments.name).length;
        var numDoc = Object.keys(comments.doc).length;

        for (var student in comments.g) {
            if (docID == null)
                dates = dates.concat(comments.g[student].a.dates);
            else if (comments.g[student].d[docID] != null)
                dates = dates.concat(comments.g[student].d[docID].dates);

            if (docID == null) {
                totalComments += comments.g[student].a.tc;
                totalCommentLength += comments.g[student].a.tcl;
                totalQuestions += comments.g[student].a.tq;
                totalQuestionLength += comments.g[student].a.tql;
                totalReplies += comments.g[student].a.tr;
                cmts.push({
                    name: student,
                    totalComments: comments.g[student].a.tc
                });
            } else if (comments.g[student].d[docID] != null) {
                totalComments += comments.g[student].d[docID].tc;
                totalCommentLength += comments.g[student].d[docID].tcl;
                totalQuestions += comments.g[student].d[docID].tq;
                totalQuestionLength += comments.g[student].d[docID].tql;
                totalReplies += comments.g[student].d[docID].tr;
                cmts.push({
                    name: student,
                    totalComments: comments.g[student].d[docID].tc
                });
            }
        }

        //Compare function that compares the totalComments
        function compare(a, b) {
            if (a.totalComments > b.totalComments) return -1;
            if (a.totalComments < b.totalComments) return 1;
            return 0;
        }

        //Sort by totalComments
        cmts.sort(compare);

        //Print Graph
        if (docID == null)
            prnt_graph(dates, 'Csum', 'Whole Class');
        else
            prnt_graph(dates, 'Cdoc', comments.doc2[docID]);

        //Print General Stats
        $('#CgenStats').html(
            '<h3>General Stats</h3>' +
            '<ul>' +
            '<li>Number of Comments: ' + totalComments + '</li>' +
            '<li>Average Comment Length: '
                + (totalCommentLength / totalComments).toFixed(2) + '</li>' +
            '<li>Number of Questions: ' + totalQuestions + '</li>' +
            '<li>Number of Replies: ' + totalReplies + '</li>' +
            '<li>Number of Members: ' + numUser + '</li>' +
            '<li>Number of Documents: ' + numDoc + '</li></ul>'
            );

        //Print Top Contributors
        var topContributors = '<h3>Top Contributors</h3><ul>';

        var i = 0;
        var m = (cmts.length < 5) ? cmts.length : 5;

        for (i = 0; i < m; i++) {
            topContributors += ('<li>' + comments.g[cmts[i].name].n + ": "
                                + cmts[i].totalComments + ' comments</li>');
        }
        topContributors += ('</ul>');

        $('#CgenStats2').html(topContributors);
    }

    //ADDING TO GRADES TAB
    var grade = [];
    for (var student in comments.g) {
        var v;

        if (docID == null)
            v = comments.g[student].a;
        else if (comments.g[student].d[docID] != null)
            v = comments.g[student].d[docID];
        else
            v = { tc: 0, tcl: 0, tq: 0, tql: 0, tr: 0 };

        v.n = comments.g[student].n;
        v.e = comments.g[student].e;
        grade.push(v);
    }

    var grade2 = { g: grade };
    $('#commentGrades').html($('#CgradesTemplate').render(grade2));
    var newTableObject = document.getElementById('cTable');
    sorttable.makeSortable(newTableObject);

    Downloadify.create('cDownload', {
        filename: function () {
            return 'commentGrades.csv';
        },
        data: function () {
            return $('#cTable').table2CSV({
                header: ['Name', 'Email', 'Comments', 'Comment Length',
                         'Questions', 'Question Length', 'Replies']
            });
        },
        onComplete: function () {
            alert('Your File Has Been Saved!');
        },
        onCancel: function () {
            alert('You have cancelled the saving of this file.');
        },
        onError: function () {
            alert('You must put something in the File Contents or there will be nothing to save!');
        },
        transparent: false,
        swf: 'media/downloadify.swf',
        downloadImage: 'images/ExportToCSV.png',
        width: 101,
        height: 20,
        transparent: true,
        append: false
    });

    //ADDING TO DETAILS TAB
    if (prntProgress)
        $('#comProgress').append("  Done!<br/>Printing Details....");
    
    $('#commentDetails').text('');
    for (student in comments.d) {
        if (comments.d[student].length > 0) {
            $('#commentDetails').append(
                "<h3>Name: " + Cdata.d[student][0].name
                + "(" + Cdata.d[student][0].email + ")</h3>");
            $('#commentDetails').append($('#CdetailsTemplate').render(comments.d[student]));
        }
    }

    //ADDING TO QUESTIONS TAB
    if (prntProgress)
        $('#comProgress').append("  Done!<br/>Printing Questions....");

    $('#commentQuestions').text('');
    for (student in comments.q) {
        if (comments.q[student].length > 0) {
            $('#commentQuestions').append(
                "<h3>Name: " + Cdata.d[student][0].name
                + "(" + Cdata.d[student][0].email + ")</h3>"
            );
            $('#commentQuestions').append($('#CquestionTemplate').render(comments.q[student]));
        }
    }

    if (prntProgress) $('#comProgress').append("  Done!<br/>Done!");

    $('.input').hide();
    window.scrollTo(0, 190);
}

function prnt_Cindividual(comments, usrID) {
    //Open up the "At a Glance" tab
    $('.onlyOneDisabledTab').removeAttr('disabled');
    $("#cgl").attr('disabled', 'disabled');
    $("#outputComments").show();
    $(".onlyOneVisibleTab").hide();
    $("#commentGlance").show();

    //Process Data for individual
    var value = {
        n: comments.g[usrID].n,
        e: comments.g[usrID].e,
        c: comments.g[usrID].c,
        q: comments.g[usrID].q,
        usrPic: "http://www.classroomsalon.org/memberpics/" + usrID + ".jpg",
        a: comments.g[usrID].a,
        d: []
    };

    value.a.acl = (value.a.tc == 0) ? 0 : (value.a.tcl / value.a.tc).toFixed(2);
    value.a.aql = (value.a.tq == 0) ? 0 : (value.a.tql / value.a.tq).toFixed(2);

    var docs = [];
    for (var document in comments.g[usrID].d) {
        var temp = comments.g[usrID].d[document];
        temp.docID = comments.doc2[document];
        docs.push(temp);
    }
    value.d = docs;

    //Output the processed Data + Graph
    $('#CIndStats').html($('#CIndividualTemplate').render(value));
    $('#commentGlance').height(1150);
    prnt_graph(comments.g[usrID].a.dates, 'CInd', comments.g[usrID].n);

    //Draws a pie graph of the # of comments per document
    var pieData = [];
    for (var index in value.d) {
        pieData.push({ name: value.d[index].docID, y: value.d[index].tc });
    }

    var chart2 = new Highcharts.Chart({
        chart: {
            renderTo: 'CIndGraph2',
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        title: {
            text: 'Comments per Document'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y} ({point.percentage}%)</b>',
            percentageDecimals: 1
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                showInLegend: true
            }
        },
        series: [{
            type: 'pie',
            name: 'Number of Comments',
            data: pieData
        }]
    });
}

//Outputs the processed data onto the page
function prnt_responses(responses, prntProgress, docID, isName, isSearch) {
    //Open up the corresponding tabs
    $('.onlyOneDisabledGroup').removeAttr('disabled');
    $('.onlyOneDisabledTab').removeAttr('disabled');
    $("#rb").attr('disabled', 'disabled');
    $("#outputResponses").show();
    $(".onlyOneVisibleTab").hide();

    if (isSearch) {
        $("#rdt").attr('disabled', 'disabled');
        $("#responseDetails").show();
    } else {
        $("#rgl").attr('disabled', 'disabled');
        $("#responseGlance").show();
    }

    //If printing for the first time....
    if (prntProgress) {
        //Print Progress
        $('#resProgress').append("<br/>Printing Grades....");

        //Output Names dropdown
        $('#rName').html('<option>Name</option>');
        var names = [];
        for (name in responses.name) {
            names.push(name);
        }
        names.sort(
            function (a, b) {
                if (a.toLowerCase().replace(/\s/g, "") < b.toLowerCase().replace(/\s/g, "")) return -1;
                if (a.toLowerCase().replace(/\s/g, "") > b.toLowerCase().replace(/\s/g, "")) return 1;
                return 0;
            });

        for (i = 0; i < names.length; i++) {
            $('#rName').append('<option>' + names[i] + '</option>');
        }

        //Output Documents dropdown
        $('#rDocument').html('<option>Document</option>');
        var docs = [];
        for (doc in responses.doc) {
            docs.push(doc);
        }
        docs.sort(
            function (a, b) {
                if (a.toLowerCase() < b.toLowerCase()) return -1;
                if (a.toLowerCase() > b.toLowerCase()) return 1;
                return 0;
            });

        for (i = 0; i < docs.length; i++) {
            $('#rDocument').append('<option>' + docs[i] + '</option>');
        }
    }

    if (docID == null || !isName) {
        $('#RIndStats').html('');
        $('#responseGlance').height(650);
    }
    //ADDING TO GLANCE TAB
    if (!isName && !isSearch) {
        //Process the Data to output the graph and other general stats
        var dates = [];
        var rspns = [];
        var totalResponses = 0;
        var totalResponseLength = 0;
        var numUser = Object.keys(responses.name).length;
        var numDoc = Object.keys(responses.doc).length;

        for (var student in responses.g) {
            if (docID == null)
                dates = dates.concat(responses.g[student].a.dates);
            else if (responses.g[student].d[docID] != null)
                dates = dates.concat(responses.g[student].d[docID].dates);

            if (docID == null) {
                totalResponses += responses.g[student].a.tr;
                totalResponseLength += responses.g[student].a.trl;
                rspns.push({
                    name: student,
                    totalResponse: responses.g[student].a.tr
                });
            } else if (responses.g[student].d[docID] != null) {
                totalResponses += responses.g[student].d[docID].tr;
                totalResponseLength += responses.g[student].d[docID].trl;
                rspns.push({
                    name: student,
                    totalResponse: responses.g[student].d[docID].tr
                });
            }
        }

        function compare(a, b) {
            if (a.totalResponse > b.totalResponse) return -1;
            if (a.totalResponse < b.totalResponse) return 1;
            return 0;
        }

        rspns.sort(compare);

        //Print the Graph
        if (docID == null)
            prnt_graph(dates, 'Rsum', 'Whole Class');
        else
            prnt_graph(dates, 'Rdoc', responses.doc2[docID]);

        //Print the General Stats
        $('#RgenStats').html(
            '<h3>General Stats</h3>' +
            '<ul>' +
            '<li>Number of Responses: ' + totalResponses + '</li>' +
            '<li>Average Comment Length: '
            + (totalResponseLength / totalResponses).toFixed(2) + '</li>' +
            '<li>Number of Members: ' + numUser + '</li>' +
            '<li>Number of Documents: ' + numDoc + '</li></ul>'
            );

        //Print the Top Contributors
        var topContributors = '<h3>Top Contributors</h3><ul>';
        var i = 0;
        var m = (rspns.length < 5) ? rspns.length : 5;

        for (i = 0; i < m; i++) {
            topContributors += ('<li>' + responses.g[rspns[i].name].n + ": "
                                + rspns[i].totalResponse + ' responses</li>');
        }
        topContributors += ('</ul>');
        $('#RgenStats2').html(topContributors);
    }

    //ADDING TO GRADES TAB
    var grade = [];
    for (var student in responses.g) {
        var v;
        if (docID == null)
            v = responses.g[student].a;
        else if (responses.g[student].d[docID] != null)
            v = responses.g[student].d[docID];
        else
            v = { tr: 0, trl: 0 };
        v.n = responses.g[student].n;
        v.e = responses.g[student].e;
        grade.push(v);
    }
    var grade2 = { g: grade };
    $('#responseGrades').html($('#RgradesTemplate').render(grade2));
    var newTableObject = document.getElementById('rTable');
    sorttable.makeSortable(newTableObject);

    Downloadify.create('rDownload', {
        filename: function () {
            return 'responseGrades.csv';
        },
        data: function () {
            return $('#rTable').table2CSV({
                header: ['Name', 'Email', 'Responses', 'Response Length']
            });
        },
        onComplete: function () {
            alert('Your File Has Been Saved!');
        },
        onCancel: function () {
            alert('You have cancelled the saving of this file.');
        },
        onError: function () {
            alert('You must put something in the File Contents or there will be nothing to save!');
        },
        transparent: false,
        swf: 'media/downloadify.swf',
        downloadImage: 'images/ExportToCSV.png',
        width: 101,
        height: 20,
        transparent: true,
        append: false
    });

    if (prntProgress)
        $('#resProgress').append(" Done!<br/>Printing Details....");

    //ADDING TO DETAILS TAB
    $('#responseDetails').text('');
    for (student in responses.d) {
        if (responses.d[student].length > 0) {
            $('#responseDetails').append(
                "<h3>Name: " + Rdata.d[student][0].name + "("
                + Rdata.d[student][0].email + ")</h3>");
            $('#responseDetails').append($('#RdetailsTemplate').render(responses.d[student]));
        }
    }

    if (prntProgress)
        $('#resProgress').append(" Done!");

    $('.input').hide();
    window.scrollTo(0, 190);
}

//Prints data for an individual user
function prnt_Rindividual(response, usrID) {
    //Open up "At a glance" tab
    $('.onlyOneDisabledTab').removeAttr('disabled');
    $("#rgl").attr('disabled', 'disabled');
    $("#outputResponses").show();
    $(".onlyOneVisibleTab").hide();
    $("#responseGlance").show();

    //Process Individual Data
    var value = {
        n: response.g[usrID].n,
        e: response.g[usrID].e,
        r: response.g[usrID].r,
        usrPic: "http://www.classroomsalon.org/memberpics/" + usrID + ".jpg",
        a: response.g[usrID].a,
        d: []
    };

    value.a.arl = (value.a.tr == 0) ? 0 : (value.a.trl / value.a.tr).toFixed(2);

    var docs = [];
    for (var document in response.g[usrID].d) {
        var temp = response.g[usrID].d[document];
        temp.docID = response.doc2[document];
        docs.push(temp);
    }
    value.d = docs;

    //Print out Individual Stats + Graph
    $('#RIndStats').append($('#RIndividualTemplate').render(value));
    prnt_graph(response.g[usrID].a.dates, 'RInd', response.g[usrID].n);
    $('#responseGlance').height(1150);

    //Prints a piechart of the number of responses per document
    var pieData = [];
    for (var index in value.d) {
        pieData.push({ name: value.d[index].docID, y: value.d[index].tr });
    }

    var chart2 = new Highcharts.Chart({
        chart: {
            renderTo: 'RIndGraph2',
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        title: {
            text: 'Responses per Document'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y} ({point.percentage}%)</b>',
            percentageDecimals: 1
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                showInLegend: true
            }
        },
        series: [{
            type: 'pie',
            name: 'Number of Responses',
            data: pieData
        }]
    });
}

//Given a keyword, searches the data for matches
function search(kw, data, isName, isDocument) {
    //If kw is not a name and a document, then change it to lowercase
    if (!isName && !isDocument)
        var keyword = kw.toLowerCase();
    
    //if keyword is nothing, then do nothing
    if (keyword == "") {
        return(data);
    }

    var filtered = {
        g: {},
        d: {},
        q: {},
        doc: data.doc,
        doc2: data.doc2,
        name: data.name
    };

    var match = false;

    //if looking for an individual just output data for that usr
    if (isName) {
        filtered.g[kw] = data.g[kw];
        filtered.d[kw] = data.d[kw];
        filtered.q[kw] = data.q[kw];
    } else {
        //if looking for a document, simply output the grades
        if (isDocument)
            filtered.g = data.g;
        else {
            //Else look throughout the grades hashtable to find a match
            for (var key in data.g) {
                var v = data.g[key];

                if (v.n.toLowerCase().indexOf(keyword) != -1 || v.e.toLowerCase().indexOf(keyword) != -1)
                    filtered.g[key] = (data.g[key]);
            }
        }

        //Search through the details hashtable
        for (var key in data.d) {
            var v = data.d[key]
            var fd = [];
            match = false;
            for (var element in v) {
                if (isDocument && v[element].documentID == kw)
                    match = true;
                else if (!isDocument) {
                    for (var subelem in v[element]) {

                        if ((typeof v[element][subelem] == "string") && v[element][subelem].toLowerCase().indexOf(keyword) != -1)
                            match = true;
                    }
                }
                if (match) fd.push(v[element]);
                match = false;
            }
            filtered.d[key] = (fd);
            match = false;
        }

        //Search through the questions hashtable
        for (var key in data.q) {
            var v = data.q[key]
            var fq = [];
            match = false;
            for (var element in v) {
                if (isDocument && v[element].documentID == kw)
                    match = true;
                else if(!isDocument) {
                    for (var subelem in v[element]) {
                        if ((typeof v[element][subelem] == "string") && v[element][subelem].toLowerCase().indexOf(keyword) != -1)
                            match = true;
                    }
                }
                if (match) fq.push(v[element]);
                match = false;
            }
            filtered.q[key] = (fq);
            match = false;
        }
    }

    return(filtered)
}

// obviously don't declare all the functions inline
var OutputHandlers = {
    comments: function (data) {
        Cdata = data;
        prnt_comments(data, true, null, false, false);
    },
    responses: function (data) {
        Rdata = data;
        prnt_responses(data, true, null, false, false);
    }
};

//Reads the input file
var readBlob = function(parser, onComplete) {

    var blobReader = function(file, startChar, endChar) {

        var start = parseInt(startChar, 10) || 0;
        var stop = parseInt(endChar, 10) || file.size - 1;

        var blob = file;

        var reader = new FileReader();
        reader.onloadend = function(event) {
            var chunk = event.target.result;
            parser.parse(chunk);
            var endOfFile = (stop == file.size - 1);
            if (endOfFile) {
                onComplete(parser.getParsedData());
            }
        };

        reader.readAsText(blob, "UTF-8");
    };

    return blobReader;
};

var readFile = function(elementId, processChunk) {
    var files = document.getElementById(elementId).files;
    $('#' + elementId).siblings('.progress').text('Processing ' + elementId + '....');
    if (files.length < 1) {
        console.error("Please choose a file.");
        return false;
    }

    var file = files[0];

    //#read all at once:
     readBlob(file);

    processChunk(file, 0, file.size - 1);
};


var Page = (function() {

    var init = function() {
        //console.log('Page.init');
        //hide the output half of the page initially
        $('.onlyOneVisibleGroup').hide();
        $('.onlyOneVisibleTab').hide();
        $('.output').hide();

        //Toggle Input and Output halves when pressed
        $('#Input').click(function () {
            $('.input').toggle();
        });
        $('#Output').click(function () {
            $('.output').toggle();
        });

        //Start Processing Data
        $('.parserStarter').attr('disabled', 'disabled').click(function(event) {
            $(this).attr('disabled', 'disabled');
            var id = $(this).data('input');
            var parser = Parsers[id];
            parser.init();
            var outputHandler = OutputHandlers[id];
            var chunkHandler = readBlob(parser, outputHandler);
            readFile(id, chunkHandler);

            $('.onlyOneDisabledTab').removeAttr('disabled');
            $('.onlyOneDisabledGroup').removeAttr('disabled');
            $('.onlyOneVisibleTab').hide();
            $('.onlyOneVisibleGroup').hide();
            $('.output').show();
        });

        $('.fileSource').change(function() {
            $(this).siblings('.parserStarter').removeAttr('disabled');
            $(this).siblings('.progress').text('');
        });

        $('.onlyOneDisabledGroup').click(function() {
            // disable this button
            $('.onlyOneDisabledGroup').removeAttr('disabled');
            $(this).attr('disabled', 'disabled');

            // figure out which output (by ID) to show
            var target = $(this).data('show');
            // hide the others
            $('.onlyOneVisibleGroup').hide();
            $('.onlyOneVisibleTab').hide();
            // show this one
            $(target).show();
        });

        $('.onlyOneDisabledTab').click(function() {
            // disable this button
            $('.onlyOneDisabledTab').removeAttr('disabled');
            $(this).attr('disabled', 'disabled');

            // figure out which output (by ID) to show
            var target = $(this).data('show');
            // hide the others
            $('.onlyOneVisibleTab').hide();
            // show this one
            $(target).show();
        });

        //Search a given keyword
        $('#search').click(function () {
            var keyword = $('#keyword').val();
            //console.log(keyword);
            if ($('#cb').is(':disabled')) {
                prnt_comments(search(keyword, Cdata, false, false), false, null, false, true);
                $('#cName').val('default');
                $('#cDocument').val('default');
            } else if ($('#rb').is(':disabled')) {
                prnt_responses(search(keyword, Rdata, false, false), false, null, false, true);
                $('#rName').val('default');
                $('#rDocument').val('default');
            }
        });

        //Also search if user presses enter key
        $('#keyword').keypress(function (event) {
            if (event.which == 13) {
                var keyword = $(this).val();
                console.log(keyword);
                if ($('#cb').is(':disabled')) {
                    prnt_comments(search(keyword, Cdata, false, false), false, null, false, true);
                    $('#cName').val('default');
                    $('#cDocument').val('default');
                } else if ($('#rb').is(':disabled')) {
                    prnt_responses(search(keyword, Rdata, false, false), false, null, false, true);
                    $('#rName').val('default');
                    $('#rDocument').val('default');
                }
            }
        });

        //Reset the comments Page
        $('#cReset').click(function () {
            $('#cName').val('default');
            $('#cDocument').val('default');
            $('#keyword').val('');
            prnt_comments(Cdata, false, null, false, false);
        });

        //Reset the response page
        $('#rReset').click(function () {
            $('#rName').val('default');
            $('#rDocument').val('default');
            $('#keyword').val('');
            prnt_responses(Rdata, false, null, false, false);
        });

        //when a document is selected from the dropdown
        $('#cDocument').change(function () {
            $("#cDocument option:selected").each(function () {
                //console.log($(this).text());
                
                $('#cName').val('default');

                if ($(this).text() == 'Document') {
                    prnt_comments(Cdata, false, null, false, false);
                } else {
                    prnt_comments(search(Cdata.doc[$(this).text()], Cdata, false, true), false, Cdata.doc[$(this).text()], false, false);
                }
            });
        });

        //when a name is selected from the dropdown
        $('#cName').change(function () {
            $("#cName option:selected").each(function () {
                //console.log($(this).text());

                $('#cDocument').val('default');

                if ($(this).text() == 'Name') {
                    prnt_comments(Cdata, false, null, false, false);
                } else {
                    prnt_comments(search(Cdata.name[$(this).text()], Cdata, true, false), false, null, true, false);
                    prnt_Cindividual(Cdata, Cdata.name[$(this).text()]);
                }
            });
        });

        //when a document is selected from the dropdown
        $('#rDocument').change(function () {
            $("#rDocument option:selected").each(function () {
                //console.log($(this).text());

                $('#rName').val('default');

                if ($(this).text() == 'Document') {
                    prnt_responses(Rdata, false, null, fasle, false);
                } else {
                    prnt_responses(search(Rdata.doc[$(this).text()], Rdata, false, true), false, Rdata.doc[$(this).text()], false, false);
                }
            });
        });

        //when a name is selected from the dropdown
        $('#rName').change(function () {
            $("#rName option:selected").each(function () {
                //console.log($(this).text());

                $('#rDocument').val('default');

                if ($(this).text() == 'Name') {
                    prnt_responses(Rdata, false, null, false, false);
                } else {
                    prnt_responses(search(Rdata.name[$(this).text()], Rdata, true, false), false, null, true, false);
                    prnt_Rindividual(Rdata, Rdata.name[$(this).text()]);
                }
            });
        });

    };

    return {
        init: init
    };
})();


$(Page.init);