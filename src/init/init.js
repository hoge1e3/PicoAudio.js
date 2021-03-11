import RandomUtil from '../util/random-util.js';
import InterpolationUtil from '../util/interpolation-util.js';

export default function init(argsObj) {
    if (this.isStarted) return;
    this.isStarted = true;

    const audioContext = argsObj && argsObj.audioContext;
    const picoAudio = argsObj && argsObj.picoAudio;

    // AudioContextを生成 //
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = audioContext ? audioContext : new AudioContext();

    // マスターボリューム //
    // リアルタイムで音量変更するためにdestination前にgainNodeを一つ噛ませる
    this.masterGainNode = this.context.createGain();
    this.masterGainNode.gain.value = this.settings.masterVolume;

    // 仮想サンプルレート //
    const sampleRate = this.context.sampleRate;
    const sampleRateVT = sampleRate >= 48000 ? 48000 : sampleRate;

    // ホワイトノイズ //
    if (picoAudio && picoAudio.whitenoise) { // 使いまわし
        this.whitenoise = picoAudio.whitenoise;
    } else {
        RandomUtil.resetSeed(); // 乱数パターンを固定にする（Math.random()を使わない）
        // 再生環境のサンプルレートによって音が変わってしまうので //
        // 一旦仮想サンプルレートで音源を作成する //
        const seLength = 1;
        const sampleLength = sampleRate * seLength;
        const sampleLengthVT = sampleRateVT * seLength;
        const vtBufs = [];
        for (let ch=0; ch<2; ch++) {
            vtBufs.push(new Float32Array(sampleLengthVT));
            const vtBuf = vtBufs[ch];
            for (let i=0; i<sampleLengthVT; i++) {
                const r = RandomUtil.random();
                vtBuf[i] = r * 2 - 1;
            }
        }
        // 仮想サンプルレート音源を本番音源に変換する //
        this.whitenoise = this.context.createBuffer(2, sampleLength, sampleRate);
        InterpolationUtil.lerpWave(this.whitenoise, vtBufs);
    }
    // FM音源用バッファ
    if (picoAudio && picoAudio.fmtones) { // 使いまわし
        this.fmtones = picoAudio.fmtones;
    } else {
        const baseFreq=48; // Buffer生音の周波数(main.jsも参照)
        const lambda=sampleRate/baseFreq; // sampleRate=48000 -> lambda=1000
        const wavParams=[
            {w:3, a:0.75, l:1},
            {w:1, a:1, l:1},
            {w:2, a:0.5, l:1},
            {w:5, a:0.2, l:1},
        ];
        this.fmtones=wavParams.map(({w,a,l})=>
            this.context.createBuffer(1, lambda*l, sampleRate)
        );
        const s=t=>Math.sin(t*Math.PI*2)*1;
        for (let j=0; j<wavParams.length;j++) {
            const {w,a,l}=wavParams[j];
            const data=this.fmtones[j].getChannelData(0);
            for (let i=0;i<data.length;i++) {
                const t=i/lambda;
                data[i]=s(t+s(t*w)*a);
            }
        }
    }
    // リバーブ用のインパルス応答音声データ作成（てきとう） //
    if (picoAudio && picoAudio.impulseResponse) { // 使いまわし
        this.impulseResponse = picoAudio.impulseResponse;
    } else {
        RandomUtil.resetSeed(); // 乱数パターンを固定にする（Math.random()を使わない）
        // 再生環境のサンプルレートによって音が変わってしまうので //
        // 一旦仮想サンプルレートで音源を作成する //
        const seLength = 3.5;
        const sampleLength = sampleRate * seLength;
        const sampleLengthVT = sampleRateVT * seLength;
        const vtBufs = [];
        for (let ch=0; ch<2; ch++) {
            vtBufs.push(new Float32Array(sampleLengthVT));
            const vtBuf = vtBufs[ch];
            for (let i=0; i<sampleLengthVT; i++) {
                const v = ((sampleLengthVT - i) / sampleLengthVT);
                const s = i / sampleRateVT;
                const d = (s < 0.030 ? 0 : v)
                    * (s >= 0.030 && s < 0.031 ? v*2 : v)
                    * (s >= 0.040 && s < 0.042 ? v*1.5 : v)
                    * (s >= 0.050 && s < 0.054 ? v*1.25 : v)
                    * RandomUtil.random() * 0.2 * Math.pow((v-0.030), 4);
                vtBuf[i] = d;
            }
        }
        // 仮想サンプルレート音源を本番音源に変換する //
        this.impulseResponse = this.context.createBuffer(2, sampleLength, this.context.sampleRate);
        InterpolationUtil.lerpWave(this.impulseResponse, vtBufs);
    }

    // リバーブ用のAudioNode作成・接続 //
    this.convolver = this.context.createConvolver();
    this.convolver.buffer = this.impulseResponse;
    this.convolver.normalize = true;
    this.convolverGainNode = this.context.createGain();
    this.convolverGainNode.gain.value = this.settings.reverbVolume;
    this.convolver.connect(this.convolverGainNode);
    this.convolverGainNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.context.destination);

    // コーラス用のAudioNode作成・接続 //
    this.chorusDelayNode = this.context.createDelay();
    this.chorusGainNode = this.context.createGain();
    this.chorusOscillator = this.context.createOscillator();
    this.chorusLfoGainNode = this.context.createGain();
    this.chorusDelayNode.delayTime.value = 0.025;
    this.chorusLfoGainNode.gain.value = 0.010;
    this.chorusOscillator.frequency.value = 0.05;
    this.chorusGainNode.gain.value = this.settings.chorusVolume;
    this.chorusOscillator.connect(this.chorusLfoGainNode);
    this.chorusLfoGainNode.connect(this.chorusDelayNode.delayTime);
    this.chorusDelayNode.connect(this.chorusGainNode);
    this.chorusGainNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.context.destination);
    this.chorusOscillator.start(0);

    // レイテンシの設定 //
    this.baseLatency = this.context.baseLatency || this.baseLatency;
    if (this.settings.baseLatency != -1) {
        this.baseLatency = this.settings.baseLatency;
    }
}
