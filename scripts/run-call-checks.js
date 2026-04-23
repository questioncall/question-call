/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalTsLoader = require.extensions[".ts"];

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const mappedRequest = path.join(projectRoot, request.slice(2));
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });

  module._compile(transpiled.outputText, filename);
};

function cleanup() {
  Module._resolveFilename = originalResolveFilename;

  if (originalTsLoader) {
    require.extensions[".ts"] = originalTsLoader;
  } else {
    delete require.extensions[".ts"];
  }
}

function runCheck(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

try {
  const {
    canIssueCallToken,
    getCallParticipantIds,
    getCallSummaryText,
  } = require("../lib/call-utils.ts");
  const {
    enqueueIncomingCall,
    removeIncomingCall,
  } = require("../lib/incoming-call-queue.ts");
  const {
    canDeleteChatMessage,
    canDeleteStoredMessage,
  } = require("../lib/message-deletion.ts");

  const makeChatMessage = (overrides = {}) => ({
    id: "message-1",
    channelId: "channel-1",
    senderId: "user-1",
    senderName: "User One",
    content: "hello",
    mediaUrl: null,
    mediaType: "TEXT",
    isSystemMessage: false,
    isOwn: true,
    isSeen: true,
    sentAt: new Date().toISOString(),
    ...overrides,
  });

  runCheck("token issuance stays gated to ACTIVE calls", () => {
    assert.equal(canIssueCallToken("ACTIVE"), true);
    assert.equal(canIssueCallToken("RINGING"), false);
    assert.equal(canIssueCallToken("MISSED"), false);
  });

  runCheck("caller and callee are derived from stored callerId", () => {
    assert.deepEqual(
      getCallParticipantIds({
        teacherId: "teacher-1",
        studentId: "student-1",
        callerId: "student-1",
      }),
      {
        teacherId: "teacher-1",
        studentId: "student-1",
        callerId: "student-1",
        calleeId: "teacher-1",
        participantIds: ["teacher-1", "student-1"],
      },
    );
  });

  runCheck("call summary text stays readable across lifecycle states", () => {
    assert.equal(
      getCallSummaryText({
        mode: "VIDEO",
        status: "ENDED",
        durationSeconds: 125,
      }),
      "Video call · 2m 5s",
    );
    assert.equal(
      getCallSummaryText({
        mode: "AUDIO",
        status: "REJECTED",
      }),
      "Audio call · Declined",
    );
    assert.equal(
      getCallSummaryText({
        mode: "AUDIO",
        status: "MISSED",
      }),
      "Audio call · Missed",
    );
  });

  runCheck("incoming call queue deduplicates same-channel calls but keeps others", () => {
    const firstCall = { callSessionId: "call-a", channelId: "channel-a" };
    const secondCall = { callSessionId: "call-b", channelId: "channel-b" };

    const queue = enqueueIncomingCall(
      enqueueIncomingCall([], firstCall),
      secondCall,
    );
    const deduped = enqueueIncomingCall(queue, {
      callSessionId: "call-c",
      channelId: "channel-a",
    });

    assert.deepEqual(queue, [firstCall, secondCall]);
    assert.deepEqual(deduped, [firstCall, secondCall]);
    assert.deepEqual(removeIncomingCall(queue), [secondCall]);
    assert.deepEqual(removeIncomingCall(queue, "call-b"), [firstCall]);
  });

  runCheck("message deletion policy blocks system, call, and non-owner messages", () => {
    assert.equal(canDeleteChatMessage(makeChatMessage()), true);
    assert.equal(
      canDeleteChatMessage(makeChatMessage({ isSystemMessage: true })),
      false,
    );
    assert.equal(
      canDeleteChatMessage(
        makeChatMessage({
          callInfo: {
            callSessionId: "call-1",
            mode: "AUDIO",
            status: "MISSED",
            durationSeconds: null,
            callerName: "User One",
            callerId: "user-1",
          },
        }),
      ),
      false,
    );
    assert.equal(canDeleteChatMessage(makeChatMessage({ isOwn: false })), false);

    assert.equal(
      canDeleteStoredMessage(
        {
          senderId: "user-1",
          isSystemMessage: false,
          callMetadata: null,
          isDeleted: false,
        },
        "user-1",
      ),
      true,
    );
    assert.equal(
      canDeleteStoredMessage(
        {
          senderId: "user-2",
          isSystemMessage: false,
          callMetadata: null,
          isDeleted: false,
        },
        "user-1",
      ),
      false,
    );
  });

  console.log("call checks passed");
} finally {
  cleanup();
}
