const loginForm = document.getElementById('login-form');
const usersUl = document.getElementById('users');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const appDiv = document.getElementById('app');
const meSpan = document.getElementById('me');
const hangupBtn = document.getElementById('hangup');

let socket;
let username;
let peer;
let localStream;
let currentTarget;

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  username = new FormData(loginForm).get('username');
  initSocket();
});

function initSocket() {
  socket = new WebSocket('ws://localhost:3000');
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'login', payload: { username } }));
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  });
}

async function handleMessage(message) {
  switch (message.type) {
    case 'login':
      if (message.success) {
        meSpan.textContent = username;
        loginForm.style.display = 'none';
        appDiv.style.display = 'block';
      } else {
        alert('Username already used');
      }
      break;
    case 'users':
      updateUserList(message.payload);
      break;
    case 'offer':
      await handleOffer(message.payload);
      break;
    case 'answer':
      if (peer) await peer.setRemoteDescription(message.payload.answer);
      break;
    case 'candidate':
      if (peer) await peer.addIceCandidate(message.payload.candidate);
      break;
    case 'hangup':
      endCall();
      break;
  }
}

function updateUserList(list) {
  usersUl.innerHTML = '';
  list.filter((u) => u !== username).forEach((user) => {
    const li = document.createElement('li');
    li.textContent = user;
    li.addEventListener('click', () => startCall(user));
    usersUl.appendChild(li);
  });
}

async function ensureLocalStream() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  }
}

function createPeer(target) {
  const pc = new RTCPeerConnection();
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.send(
        JSON.stringify({ type: 'candidate', payload: { target, candidate: e.candidate } })
      );
    }
  };
  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
      endCall();
    }
  };
  return pc;
}

async function startCall(target) {
  await ensureLocalStream();
  peer = createPeer(target);
  currentTarget = target;
  localStream.getTracks().forEach((t) => peer.addTrack(t, localStream));
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.send(JSON.stringify({ type: 'offer', payload: { target, offer } }));
  hangupBtn.style.display = 'block';
}

async function handleOffer(payload) {
  const accept = confirm(`${payload.from} is calling you. Accept?`);
  if (!accept) {
    socket.send(JSON.stringify({ type: 'hangup', payload: { target: payload.from } }));
    return;
  }
  await ensureLocalStream();
  currentTarget = payload.from;
  peer = createPeer(payload.from);
  localStream.getTracks().forEach((t) => peer.addTrack(t, localStream));
  await peer.setRemoteDescription(payload.offer);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.send(
    JSON.stringify({ type: 'answer', payload: { target: payload.from, answer } })
  );
  hangupBtn.style.display = 'block';
}

function endCall() {
  if (peer) {
    peer.close();
    peer = null;
  }
  remoteVideo.srcObject = null;
  hangupBtn.style.display = 'none';
  if (currentTarget) {
    socket.send(JSON.stringify({ type: 'hangup', payload: { target: currentTarget } }));
    currentTarget = null;
  }
}

hangupBtn.addEventListener('click', endCall);
