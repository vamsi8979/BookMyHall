//for express js
var express = require("express");
var app     = express();
var async = require("async");//for mail
var nodemailer = require("nodemailer");//for mail
var crypto = require("crypto");//for mail
//for mongoose
var mongoose = require("mongoose");
//mongoose.connect("mongodb://localhost/Bv9");
mongoose.connect("mongodb://bookmyhall:hall@ds159892.mlab.com:59892/bookmyhall");

var moment = require("moment");//for time
//for multer and path
const multer   = require("multer"); //for multer
const path     = require("path"); // for setting path
//for update
var methodOverride = require("method-override");
//for AUTH
var passport              = require("passport");
var bodyParser            = require("body-parser");
var LocalStrategy         = require("passport-local");//using local
var passportLocalMongoose = require("passport-local-mongoose");
app.use(bodyParser.urlencoded({ extended : true}));//for form elements
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    next();
});
app.use(methodOverride("_method"));//for update i.e app.put
//AUTH CONFIG START
var Auth = require("./models/user");//for AUTH schema
app.use(require("express-session")({
    secret : "576_139",//key for encryption
    resave : false,
    saveUninitialized : false
}));
app.use( express.static(   "public" ) );
app.set('view engine' , 'ejs');
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Auth.authenticate()));
passport.serializeUser(Auth.serializeUser());
passport.deserializeUser(Auth.deserializeUser());
//AUTH CONFIG END

//for flassh
var flash = require("connect-flash");
app.use(flash());
app.use(function(req , res, next){
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.info = req.flash("info");
    next();
});
//creating Images Schema
var ImageSchema = new mongoose.Schema({ 
    fieldname: String,
    originalname: String,
    encoding: String,
    mimetype: String,
    destination: String,
    filename: String,
    path: String,
    size: Number
 });
var Image =  mongoose.model("Image" , ImageSchema );
//creating Customer Schema
var CustomerSchema = new mongoose.Schema({
    name     : String,
    email    : String,
    phno     : String,
    location : String,
    Address  : String,
    createdTime : { type : Date , default : Date.now }
});
var Customer =  mongoose.model("Customer" , CustomerSchema );
//creating Owner Schema

var OwnerSchema = new mongoose.Schema({
    name     : String,
    halls     :[
        {
            type :mongoose.Schema.Types.ObjectId,
            ref  :"Hall"
        }
    ],
    email    : String,
    phno     : String,
    location : String,
    createdTime : { type : Date , default : Date.now }
});
var Owner =  mongoose.model("Owner" , OwnerSchema );
//creating Hall Schema

var HallSchema = new mongoose.Schema({
    name         : String,
    email        : String,
    images     :[
        {
            type :mongoose.Schema.Types.ObjectId,
            ref  :"Image"
        }
    ] ,     
    location     : String,
    Address      : String,
    cost         : Number,
    capacity     : Number,
    Desc         : String,
    book     :[
        {
            type :mongoose.Schema.Types.ObjectId,
            ref  :"Book"
        }
    ],
    Reviews      : String,
    Events       : String,
    Services     : String,
    createdTime : { type : Date , default : Date.now }
});
var Hall =  mongoose.model("Hall" , HallSchema );

//creating Customer Schema
var BookSchema = new mongoose.Schema({
     customer :[String],
     owner    :[String],
    hall     :[
        {
            type :mongoose.Schema.Types.ObjectId,
            ref  :"Hall"
        }
    ], 
    FromDate :[Date],
    NumOfDays:Number,
    EventName:String,  
    createdTime : { type : Date , default : Date.now }
});
var Book =  mongoose.model("Book" , BookSchema );


// set storage engine start
const storage = multer.diskStorage({
    destination : './public/uploads',
    filename : function(req,file ,cb   ){
        cb( null , file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

//init upoad
const upload = multer ({
    storage: storage,
    limits : {fileSize : 10000000  },
    fileFilter : function(req,file , cb){
        checkFileType(file , cb);   
    }
}).single('myImage');
//check file function 
function checkFileType(file ,cb){
    //allowed extension 
    const filetypes = /jpeg|jpg|png|gif/;
    const extname   = filetypes.test(path.extname(file.originalname).toLowerCase());
    //check mime
    const mimetype =filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    }else{
        cb("error : Images Only")
    }
}
//=================//
//ROUTES
//=================//
//home page
app.get( "/" , function(req,res){
    res.render("home"  , { currentUser : req.user } );
});
//=====//sorting test
app.get("/sort", function(req,res){
    Hall.find({}).sort({cost:1}).exec(function(err,found){
        if(err){
            // console.log(err);
        }
        else{
            for (var i = 0; i < found.length; i++) {
                // console.log(found[i].cost);
            }
            res.send(found);
        }
    });
});
//=======//
// search page
app.get("/search" , function(req,res){
    if(req.query.location_search){
        const regex = new RegExp(escapeRegex(req.query.location_search), 'gi');
        Hall.find({ $or: [ { location: regex }, { name :  regex } ] }).populate("images").exec(function(err,user){
            if(err){
                console.log(err);
                // res.redirect("/");
            }else{
                var noMatch = "";
                    //======// checking for empty images and making non empty
                    for (var i = 0; i < user.length; i++) {
                        if(user[i].images.length == 0 ){
                            var newImage = {
                                fieldname: "",
                                originalname: "",
                                encoding: "",
                                mimetype: "",
                                destination: "",
                                filename: "",
                                path: "",
                                size: 0
                            }
                            user[i].images.push(newImage);
                        }
                    }
                    //=====//Pushed fake data error solved
                if(user.length < 1 ){
                    noMatch = "404 Halls Not Found "
                }
                res.render("search" , { currentUser : req.user , halls : user  , noMatch : noMatch} ) ;
                
            }
        });
    }
    else if(req.query.cost){
        Hall.find({}).populate("images").sort({cost : req.query.cost }).exec(function(err,user){
            if(err){
                console.log(err);
            }
            else{
                var noMatch = "";
                    //======// checking for empty images and making non empty
                    for (var i = 0; i < user.length; i++) {
                        if(user[i].images.length == 0 ){
                            var newImage = {
                                fieldname: "",
                                originalname: "",
                                encoding: "",
                                mimetype: "",
                                destination: "",
                                filename: "",
                                path: "",
                                size: 0
                            }
                            user[i].images.push(newImage);
                        }
                    }
                    //=====//Pushed fake data error solved
                res.render("search" , { currentUser : req.user , halls : user  , noMatch : noMatch} ) ;
             
            }
        });
    }
    else if(req.query.capacity){
        Hall.find({}).populate("images").sort({capacity : req.query.capacity }).exec(function(err,user){
            if(err){
                console.log(err);
            }
            else{
                var noMatch = "";
                    //======// checking for empty images and making non empty
                    for (var i = 0; i < user.length; i++) {
                        if(user[i].images.length == 0 ){
                            var newImage = {
                                fieldname: "",
                                originalname: "",
                                encoding: "",
                                mimetype: "",
                                destination: "",
                                filename: "",
                                path: "",
                                size: 0
                            }
                            user[i].images.push(newImage);
                        }
                    }
                    //=====//Pushed fake data error solved
                res.render("search" , { currentUser : req.user , halls : user  , noMatch : noMatch} ) ;
             
            }
        });
    }
    else{
        Hall.find({}).populate("images").exec(function(err,user){
            if(err){
                console.log(err);
                // res.redirect("/");
            }else{
                var noMatch = "";
                //======// checking for empty images and making non empty
                for (var i = 0; i < user.length; i++) {
                    if(user[i].images.length == 0 ){
                        var newImage = {
                            fieldname: "",
                            originalname: "",
                            encoding: "",
                            mimetype: "",
                            destination: "",
                            filename: "",
                            path: "",
                            size: 0
                        }
                        user[i].images.push(newImage);
                    }
                }
                //=====//Pushed fake data error solved
                res.render("search" , { currentUser : req.user , halls : user , noMatch :noMatch} ) ;
            }
        });
    }   
});
//view dates which are booked
app.get("/hall/:mail/viewDates", isLoggedIn,function(req,res){

    Book.find( { owner : req.params.mail } , function(err,found){
        if(err){
            console.log(err);
        }else{
            res.render("viewDates" , { book : found , currentUser : req.user } );
        }
    });
    
});
//forgot password
app.get("/forgotPassword" , function(req,res){
    res.render("forgotPassword"  , { currentUser : req.user }  );
});
//post forgot password
app.post('/forgotPassword', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        Auth.findOne({ username: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgotPassword');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'gmail', 
          auth: {
            user: 'celebrons.bookmyhall@gmail.com',
            pass: 'celebrons@bookmyhall'
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'celebrons.bookmyhall@gmail.com',
          subject: 'BookMyHall Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
        //   console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgotPassword');
    });
  });
  
  app.get('/reset/:token', function(req, res) {
    Auth.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgotPassword');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        Auth.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgotPassword');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('/forgotPassword');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'gmail', 
          auth: {
            user: 'celebrons.bookmyhall@gmail.com',
            pass: 'celebrons@bookmyhall'
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'celebrons.bookmyhall@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\t\t This is From BookMyHall\n\n' + 
            'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
        if(req.user.type == "C"){
            res.redirect("/customer");
        }else if(req.user.type == "O"){
            res.redirect("/owner");
        }
    });
  });
  


//for adding owners and customers by admin
app.get("/addUsers" , function(req,res){
    res.render("addUsers"  , { currentUser : req.user }  );
});
app.post("/addUsers" , function(req,res){
    var name = req.body.name;
    var Hname = req.body.Hname;
    var email = req.body.username;
    var password = req.body.password;
    var mobile = req.body.mobile;
    var location = req.body.location;
    var newOwner = {
        name     : name,
        email    : email,
        phno     : mobile,
        location : location
    };
    var newHall = {
        name         : Hname,
        email        : email,
        location     : "",
        Address      : "",
        cost         : "",
        capacity     : "",
        Desc         : "",
        Availability : "",
        Reviews      : "",
        Events       : "",
        Services     : ""
    };
    Auth.register(new Auth( { username : req.body.username , type :"O" }) ,req.body.password ,function(err ,user){
        if(err){
            console.log(err);
            req.flash("error" , err.message );
            res.redirect('addUsers');
        }else{
            passport.authenticate("local")(req,res,function(){
                Owner.create( newOwner  ,function(err , owner){
                    if (err) {
                        console.log(err);
                    }else{
                        // console.log("New Owner Added\n" + owner + "\n");
                        Hall.create( newHall ,function(err , hall){
                            if(err){
                                console.log(err);
                            }else{
                            //   console.log("Hall Details \n"+hall+"\n");
                              //hall.images.push(cretaed image)
                              owner.halls.push(hall) ;
                            //   console.log("after push owner.halls.push\n"+owner+"\n");
                              owner.save(function(err,data){
                                  if(err){
                                      console.log(err);
                                  }else{
                                    //   console.log("Data Details\n" + data + "\n");
                                  }
                              });
                            }
                        });
                    }
                });
                res.redirect("/secret");
            });
        }
    });
    
});
//secret
app.get("/secret" ,isLoggedIn ,function(req,res){ 
    Auth.find( {} , function(err , user){
        if(err){
            console.log(err);
            res.redirect("/");
        }
        else{
            res.render("secret", { user : user , currentUser : req.user } );
        }
    });
});
//Auth Routes
//show register form
app.get("/register" , function(req,res){
    res.render("register", {currentUser : req.user });
});
//handle form elements
app.post("/register" , function(req,res){
    var name = req.body.name;
    var email = req.body.username;
    var password = req.body.password;
    var mobile = req.body.mobile;
    var location = req.body.location;
    var newCustomer  = { 
            name     : name,
            email    : email,
            phno     : mobile,
            location : location
    };
    Auth.register(new Auth( { username:req.body.username , type :"C" }) ,req.body.password ,function(err ,user){
        if(err){
            console.log(err);
            req.flash("error" , "Email Already Exits !!!  ");
            res.redirect('/register');
        }else{
            passport.authenticate("local")(req,res,function(){
                Customer.create(newCustomer,function(err,newlyCreated){
                    if(err){
                        console.log(err);
                    }else{
                        // console.log(newlyCreated);
                    }
                });
                res.redirect("/search");
            });
        }
        
    });
});
//LOGIN ROUTES
//LOGIN FORM
app.get("/login" ,function(req,res){
    res.render("login" , { currentUser : req.user  } );
});
//login logic
app.post("/login" , passport.authenticate("local",{failureRedirect:"/register"}) ,function(req,res){     
    
    Auth.findOne({username:req.body.username} , function(err , user){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/login");
        }
        else{
            if(user.type=="O")
            {
                res.redirect("/owner");
            }else if(user.type == "C"){
                res.redirect("/search");
            }
        }
    });
});
//customer profile
app.get("/customer",isLoggedIn,function(req,res){
    Customer.find( { email : req.user.username }  , function(err,found){
        if(err){
            console.log(err);
        }else{
            
            Book.find({ customer : req.user.username } ).populate("hall").exec( function(err,book){
                if(err){
                    console.log(err);
                }
                else{
                    res.render("customer" , { found : found , book: book  , currentUser : req.user } );                   
                }
            });
        }
    });
});
//customer update form
app.get("/customer/:id" , function(req,res){
    Customer.findById( req.params.id , function(err,data){
        if(err){
            console.log(err);
        }else{
            // console.log(data);
            res.render("customer_form" , {data : data });
        }
    });
});
//customer app put
app.put("/customer/:id" , isLoggedIn ,function(req,res){
    //find and update owner and redirect
    var newCust = {
        name     : req.body.name,
        phno     : req.body.mobile,
        location : req.body.location
    };
    Customer.findByIdAndUpdate( req.params.id , newCust , function(err,updated){
        if(err){
            console.log(err);
            res.send("ERROR OCCURED"+err);
        }else{
            // console.log(updated);
            res.redirect("/customer");
        }
    });
});
//owner dashboard page
app.get("/owner" ,isLoggedIn,function(req,res){
    // console.log(req.user.username);
    var Oemail =  req.user.username;
    Owner.findOne({email: Oemail}).populate("halls").exec(function(err,user){
        if(err){
            console.log(err);
            // res.redirect("/");
        }else{
            res.render("owner" , { currentUser : req.user , user : user });
        }
    });
    
});
app.get("/owner/:email/viewCustomers" , isLoggedIn,function(req,res){

    Book.find( { owner : req.params.email} , function(err,found){
        if(err){
            console.log(err);
        }else{
            // console.log(found);
            res.render("viewCustomers" , { currentUser : req.user ,found : found } );
            // res.send(found);
        }
        
    });
    
});
app.get("/viewOneCustomer/:email" , function(req,res){
    Customer.findOne({ email : req.params.email  } , function(err,data){
        if(err){
            console.log(err);
        }else{
            // console.log(data);
            res.render("viewOneCustomer", {data : data , currentUser:req.user});
        }
    });
    
});
//Owner details update get
app.get("/owner/:id/edit" ,isLoggedIn , function(req,res){
    Owner.findById(req.params.id , function(err,found){
        if(err){
            console.log(err);
        }else{
            // res.send("ID :"+req.params.id + " data " + found ) ;
            res.render("owner_form" , { currentUser : req.user , owner : found });
        }
    }); 
});

//Owner details update put
app.put("/owner/:id/edit" , isLoggedIn ,function(req,res){
    //find and update owner and redirect
    var newOwner = {
        name     : req.body.name,
        phno     : req.body.mobile,
        location : req.body.location
    };
    Owner.findByIdAndUpdate( req.params.id , newOwner , function(err,updated){
        if(err){
            console.log(err);
            res.send("ERROR OCCURED"+err);
        }else{
            // console.log(updated);
            res.redirect("/owner");
        }
    });
});
//owner image get
app.get("/image/:id/edit" , isLoggedIn ,function(req,res){
    Hall.findById( req.params.id).populate("images").exec(function(err,found){
        if(err){
            console.log(err);
        }else{
            // console.log(found);
            res.render("owner_gallery", { currentUser : req.user , halls : found });
        }
    });
});
//image upload
app.post("/image/:id/edit" , isLoggedIn ,function(req,res){
    Hall.findById(req.params.id , function(err,found){
        if(err){
            console.log(err);
        }else{
            // console.log("found hall \n"+found+"\n");
            // res.render("hall_form" , { hall : found });
            upload(req,res,(err) => {
                if(err){
                    console.log(err);
                }else{
                    // console.log("req.file \n"+ req.file + "\n");
                    Image.create(req.file,function(err,newlyCreated){
                        if(err){
                            console.log(err);
                        }else{
                            // console.log("newlycreated image\n"+newlyCreated+"\n");
                            found.images.push(newlyCreated);
                            // console.log("found.images.push\n"+found+"\n");
                            found.save(function(err,final){
                                if(err){
                                    console.log(err);
                                }else{
                                    // console.log("final is \n" + final + "\n");
                                    res.redirect("/image/"+req.params.id+"/edit");
                                }
                            });
                            
                        }
                    });
                }
            });
        }
    });
});
//Get Hall Details By Id
app.get("/hall/:id/view", isLoggedIn , function(req,res){
    var status = "";
    Hall.findById( req.params.id).populate("images").exec(function(err,found){
        if(err){
            console.log(err);
        }else{
            //===//Checking Empty Images and making non Empty
            if(found.images.length == 0 ){
                var newImage = {
                    fieldname: "cs",
                    originalname: "sd",
                    encoding: "sz",
                    mimetype: "sz",
                    destination: "sz",
                    filename: "sz",
                    path: "zs",
                    size: 0
                }
                found.images.push(newImage);
            }
            //===// ERROR SOLVED
            res.render("hall", { currentUser : req.user , hall : found , status : status });
        }
    });
    
});
//Hall Details  update get
app.get("/hall/:id/edit" , isLoggedIn ,function(req,res){
    Hall.findById(req.params.id , function(err,found){
        if(err){
            console.log(err);
        }else{
            // console.log(found);
            res.render("hall_form" , { currentUser : req.user , hall : found });
        }
    });
});
//Hall details update put
app.put("/hall/:id/edit" , isLoggedIn , function(req,res){
    //find and update hall and redirect
    var newHall = {
        name         : req.body.name,
        email        : req.body.username,
        location     : req.body.location,
        Address      : req.body.Address,
        cost         : req.body.cost,
        capacity     : req.body.capacity,
        Desc         : req.body.Desc,
        Events       : req.body.Events,
        Services     : req.body.Services
    };
    Hall.findByIdAndUpdate( req.params.id , newHall , function(err,updated){
        if(err){
            console.log(err);
            res.send("ERROR OCCURED"+err);
        }else{
            // console.log(updated);
            res.redirect("/owner");
        }
    });
});
//book now page
app.get("/hall/:id/book" , isLoggedIn ,function(req,res){
    Hall.findById( req.params.id).populate("images").exec(function(err,found){
        if(err){
            console.log(err);
        }else{
            res.render("bookNow", { currentUser : req.user , halls : found });
        }
    });
});
//for check availibity
app.post("/hall/:id/check", isLoggedIn, function(req,res){
    var myDate = req.body.FromDate;
    Hall.findById(req.params.id ).populate("images").exec( function(err,data){
        if(err){
            console.log(err);
        }else{
            // console.log("====================\n\n\n"+data+"======================\n\n\n");
            Book.find({owner : data.email } , function(err, book){
                if(err){
                    console.log(err);
                }else{
             
                    var flag = 0;
                   
                    
                    for (var i = 0 ; i < book.length; i++) {
                        var today = new Date(book[i].FromDate);//date from database
                        var NumOfDays = book[i].NumOfDays;
                        // console.log("dfcgvbhjnmk : ==== "+NumOfDays);
                        var tomorrow = new Date(today);//for incrementing the date to next day
                        var got = new Date(myDate);//date submitted by user to check 
        
                        for (var j = 0 ; j < NumOfDays ; j++ ){
                            if(got.getTime() === tomorrow.getTime()){
                                // console.log("Already Booked\n");
                                flag ++ ; 
                                break;
                            }
                            tomorrow.setDate(tomorrow.getDate() + 1);//increment date by one day
                        }
                    }
                    var status = "";
                    if(flag == 1){
                        status = "BOOKED && Not Available";
                        
                    }
                    else{
                        status = "NOT BOOKED && Available";
                    }
                    req.flash("info" , status );
                    res.render("hall" , { status : status , hall : data , currentUser : req.user }  );
                }
            });
        }
    });
});
//for book the hall
app.post("/hall/:id/book" , isLoggedIn ,function(req,res){
    // customer :[String],
    // FromDate :[Date],
    // NumOfDays:Number,
    // EventName:String,  
    
    var myDate = req.body.FromDate;
    Hall.findById(req.params.id ).populate("images").exec( function(err,data){
        if(err){
            console.log(err);
        }else{
            // console.log("====================\n\n\n"+data+"======================\n\n\n");
            Book.find({owner : data.email } , function(err, book){
                if(err){
                    console.log(err);
                }else{
                    
                    var flag = 0;
                   
                    
                    for (var i = 0 ; i < book.length; i++) {
                        var today = new Date(book[i].FromDate);//date from database
                        var NumOfDays = book[i].NumOfDays;
                        // console.log("dfcgvbhjnmk : ==== "+NumOfDays);
                        var tomorrow = new Date(today);//for incrementing the date to next day
                        var got = new Date(myDate);//date submitted by user to check 
        
                        for (var j = 0 ; j < NumOfDays ; j++ ){
                            if(got.getTime() === tomorrow.getTime()){
                                // console.log("Already Booked\n");
                                flag ++ ; 
                                break;
                            }
                            tomorrow.setDate(tomorrow.getDate() + 1);//increment date by one day
                        }
                    }
                    var status = "";
                    if(flag == 1){
                        status = "Your Selected Date is Already BOOKED && Not Available";
                        req.flash( "info" , status);
                        res.redirect("/hall/" + req.params.id + "/view");
                        
                    }
                    else{
                        status = "NOT BOOKED && Available";
                        var newBook = {
                            customer : req.user.username,
                            FromDate :req.body.FromDate,
                            NumOfDays:req.body.NumOfDays,
                            EventName:req.body.EventName
                        }
                        //creating a boook details and inserting  hall id into that book data
                        Book.create( newBook , function(err,bookData){
                            if(err){
                                console.log(err);
                            }else{
                                // console.log("Created book data \n" + bookData );
                                //hall customer
                                Hall.findById( req.params.id , function(err,hallData){
                                    if(err){
                                        console.log(err);
                                    }else{
                                        bookData.owner.push(hallData.email);
                    
                                        // console.log("After newbook\n"+newBook +"Found hall data\n"+hallData);
                                        bookData.hall.push(hallData);
                                        // console.log("pushed hall data into bookdata\n" + bookData );
                                        bookData.save(function(err,final){
                                            if(err){
                                                console.log(err);
                                            }else{
                                                // console.log("=================Final data=========\n\n"+final+"\n\n==========================\n\n");       
                                                Hall.findByIdAndUpdate( req.params.id   , { book : final }  , function(err,updated){
                                                    if(err){
                                                        // console.log(err);
                                                        res.send("ERROR OCCURED"+err);
                                                    }else{
                                                        // console.log("============updated=====================\n\n"+updated+"\n\n==============================================\n\n");
                                                        req.flash("success", "Successfully Booked !!");
                                                        if(req.user.type == "C"){
                                                            res.redirect("/customer");
                                                        }else if(req.user.type == "O"){
                                                            res.redirect("/owner");
                                                        }
                                                        
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                                
                            }
                        });
                    }
                   
                }
            });
        }
    });   
});
//logout
app.get("/logout" , function(req,res){
    req.logout();
    req.flash("success", "Successfully Logged Out !!");
    res.redirect("/");
});
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error" , "Please , Log in First!!");
    res.redirect("/login");
}
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
// app.listen("3001","localhost",function(){
//     console.log("localhost:3001 \n\n ..::  !! BOOK MY HALL !! ::.. \n\n SERVER STARTED");
// });
app.listen(process.env.PORT,process.env.IP);