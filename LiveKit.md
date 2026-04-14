LiveKit Integration README
Overview

We are using LiveKit in our Next.js app for 1:1 teacher-student audio/video calls.

Scope for v1
1 teacher ↔ 1 student
audio call
video call
mute / unmute
camera on / off
leave / end call
Not included in v1
group calls
recording
screen share
transcripts
AI summaries
Zoom replacement for live classes
Why LiveKit

We already use Zoom for live classes with 1 teacher and multiple students.
For private 1:1 sessions, we need a call experience inside our own app.

LiveKit gives us:

low-latency realtime audio/video
browser-based calling
easy React integration
server-side token-based security
clean fit with Next.js
How we will use LiveKit in our app
Architecture
Next.js frontend → renders call UI
Next.js API routes → create secure LiveKit access tokens
LiveKit Cloud → handles realtime audio/video transport
MongoDB → stores call session records
Pusher → optional call events like ringing / accepted / ended
Responsibility split
LiveKit handles
audio/video streaming
room connection
mic/camera publishing
mute/unmute behavior
reconnect handling
Our app handles
authentication with NextAuth
teacher/student access control
call session creation
room ownership and permissions
call status in database
business rules and future billing logic
Required environment variables

Add these to .env.local:

LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
Important
LIVEKIT_API_SECRET must stay server-side only
never expose LiveKit secret in frontend code
tokens must always be generated from backend
Packages we will use

Install:

pnpm add livekit-client @livekit/components-react livekit-server-sdk
Package usage
livekit-client → LiveKit browser SDK
@livekit/components-react → React UI components
livekit-server-sdk → server-side token generation
App flow
1. Create call session

Our backend creates a CallSession record in MongoDB.

2. Generate room name

We create a unique room name like:

call_<callSessionId>
3. Generate token from backend

When teacher or student joins, backend verifies access and returns:

token
serverUrl
4. Connect from frontend

Frontend connects to LiveKit room using:

LIVEKIT_URL
generated token
5. User controls

Inside the room:

mute / unmute mic
enable / disable camera
leave call
6. End session

When call ends, update database status to ended.

Planned API routes
app/api/calls/create/route.ts
app/api/calls/[id]/token/route.ts
app/api/calls/[id]/end/route.ts
create
authenticate user
verify teacher/student permission
create CallSession
generate room name
token
authenticate user
verify user belongs to this call
create LiveKit access token
return token + server URL
end
authenticate user
mark session ended
optionally notify other participant
Planned frontend route
app/(workspace)/calls/[callId]/page.tsx

This page will:

fetch token from backend
connect to LiveKit
render local/remote participant
show call controls
UI approach

We will use @livekit/components-react for faster integration.

v1 controls
join call
mic toggle
camera toggle
leave call
Call modes
Audio mode → camera off
Video mode → camera on
Database model

We will add a CallSession model with fields like:

roomName
teacherId
studentId
mode → AUDIO | VIDEO
status → CREATED | ACTIVE | ENDED | REJECTED | MISSED
startedAt
endedAt
Security rules
only backend can generate LiveKit tokens
only assigned teacher/student can join a room
no direct room access from client without validation
LiveKit secret must never be exposed
Project rules
use LiveKit only for 1:1 calls
keep Zoom for live classes
keep auth/permissions in backend
store call state in MongoDB
use Pusher only for events, never for media