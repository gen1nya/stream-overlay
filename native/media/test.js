const { GSMTCBridge } = require('./build/Release/gsmtc.node');

const bridge = new GSMTCBridge();
bridge.start((s) => {
  const sec = (x)=>Math.round((x||0)/1000);
  console.log(`[${s.appId}] ${s.title} — ${s.artist}  ${sec(s.positionMs)}/${sec(s.durationMs)}s  status=${s.playbackStatus}`);
  console.log(`${s.thumbnail.length}`);
});

console.log('GSMTC started, waiting for events...');
process.stdin.resume();
