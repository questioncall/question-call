1. We need CRON for real . so make a clean cron.md file and just add there the list of urls which i will add to cron.job.org - 

# client need some changes. 
 1.right now the teacher submut the answer and then student rate and close the channnel. and that submitted answeer is question answer. but we need to also check does that channel rating is more than 1 or not coz if student rate the teacher 1 then we need to make sure teacher wallet point is deduecte dby point 1(which should come form platform config - so admin can later alter the value. ) - and also close the channel which is happeining right noe and then also we need to push that question to the top ui as open and other teacher but not that tacher can accept. and this process is max per question. like one quesiton after 1 start rating can only go to top ui 3 times ( again this value should be configurable by admin). like teacher submit answer and student rate 1 then question still dont have valid answer and then qustion again go to top and then again another teacher submit answer and student rate 1 then again question go to top and this process is max 3 times. and after that we will not push that question to top ui and mark the last teacher answer as question answer.

 2. Also we need to manage the service as the teacher get the more than 1 rating like 2 ,3,4,5 thrn we give extra bonous point like 0.1,0.2,0.3,0.4 (this value should be configurable by admin). and also we will track the teacher as every month if they succeed to maintain thier high score at the end of the month then we credit them 1 point (this value should be configurable by admin). 

 3. channel expiration is not making the channel auto closes and push the question to ui also if chanel expires and teacher fails to answer then we deduct the teacher point by 1 (this value should be configurable by admin). 

 4. Make the each question asnwer type text,photo,video submission duration max 15 min (this value should be configurable by admin) all three type need to be managed sepeartley via the amdin. but default for all themis 15 min .

 5. Also we need to change the plan days like trial 3 days, go 30days(1 month), plus 60 days(2 month), pro 90 days(3 month), max 120 days(6 month) but when the question count is reached to its point then we make the user renew theri subscription again these all vlasues should admin congifgurabele .

 6. when the teacher and student calls each other via communciaction channel chat-are.tsx then we need to make sure the system itself never records the call. 

 7. In the Admin Notification add the button to see all the hisroty of notifications.

 8. in the setting or amdin panel there is no ui for the amdin creatin - add that missong modal to add more admins and also assing their roles as acting admin or master admin. 

 9. In the amdin panel coupon code. when we create the coupon then when we sleect the region as specfic course then submitton thros errro as courseId is required. also add the dropdown of all the course and also add the search bar in the dropwdown so we can easily find the course. and make that coupon for that course. and also when we create the coupon then we need to add the button to see all the hisroty of coupons. 

 10. Right now we dont know what is hapeign when we refere to a friend like both is getting some question ask number might be 5. but cleint said he want as if A referer B then A get 3 more question ask and B get 1 question ask. and same goes with others like B to C. also we need to show the bonous question recieved hisroty when the user egt bonous for refereal or peer comments etc - (this is very important ) , also when the refree singup with the refral code then we notify the both user as you recieve dthi smuch points coz you singed via refera code .

 11. 