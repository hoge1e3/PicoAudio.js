import picoAudioConstructor from './init/constructor.js';
import init from './init/init.js';

import setData from './player/set-data.js';
import initStatus from './player/init-status.js';
import play from './player/play.js';
import stop from './player/stop.js';

import createBaseNote from './player/sound-source/create-base-note.js';
import createNote from './player/sound-source/create-note.js';
import createPercussionNote from './player/sound-source/create-percussion-note.js';

import stopAudioNode from './player/stop-manager/stop-audio-node.js';
import pushFunc from './player/stop-manager/push-func.js';
import clearFunc from './player/stop-manager/clear-func.js';

import getTime from './player/time/get-time.js';
import getTiming from './player/time/get-timing.js';

import parseSMF from './smf/parse-smf.js';

import startWebMIDI from './web-midi/start-web-midi.js';

class PicoAudio {
    /**
     * PicoAudioクラスのコンストラクタ
     * @param {Object} argsObj
     */
    constructor(argsObj) {
        picoAudioConstructor.call(this, argsObj);
    }

    /**
     * 初期化・準備
     * @param {Object} argsObj
     */
    init(argsObj) {
        return init.call(this, argsObj);
    }

    /**
     * MIDIファイル(SMF)を解析する
     * @param {Uint8Array} smf MIDIファイルの内容が入ったUint8Arrayオブジェクト
     * @returns {Object} 再生用の情報が入ったオブジェクト
     */
    parseSMF(smf) {
        return parseSMF.call(this, smf);
    }

    /**
     * 再生用のデータをセットする
     * @param {Object} data PicoAudio.parseSMF()で返されたオブジェクト
     */
    setData(data) {
        return setData.call(this, data);
    }

    /**
     * 再生
     * @param {boolean} _isSongLooping PicoAudio内部で使う引数
     */
    play(_isSongLooping) {
        return play.call(this, _isSongLooping);
    }

    /**
     * 一時停止
     * @param {boolean} _isSongLooping PicoAudio内部で使う引数
     */
    pause(_isSongLooping) {
        return stop.call(this, _isSongLooping);
    }

    /**
     * 停止
     * @param {boolean} _isSongLooping PicoAudio内部で使う引数
     */
    stop(_isSongLooping) {
        return stop.call(this, _isSongLooping);
    }

    /**
     * リセット
     * @param {boolean} _isSongLooping PicoAudio内部で使う引数
     * @param {boolean} _isLight PicoAudio内部で使う引数
     */
    initStatus(_isSongLooping, _isLight) {
        return initStatus.call(this, _isSongLooping, _isLight);
    }

    setStartTime(offset) {
        this.states.startTime -= offset;
    }

    // 時関関係 //
    /**
     * tickからtime(秒)を求める
     * @param {number} tick
     * @returns {number} time(秒)
     */
    getTime(tick) {
        return getTime.call(this, tick);
    }
    /**
     * time(秒)からtickを求める
     * @param {number} time
     * @returns {number} tick
     */
    getTiming(time) {
        return getTiming.call(this, time);
    }

    // 再生・音源関係 //
    /**
     * 再生処理（Web Audio API の oscillator等で音を鳴らす）
     * @param {Object} option
     * @param {boolean} isDrum
     * @param {boolean} isExpression
     * @param {boolean} nonChannel
     * @param {boolean} nonStop
     * @returns {Object} AudioNodeやパラメータを返す
     */
    createBaseNote(option, isDrum, isExpression, nonChannel, nonStop) {
        return createBaseNote.call(this, option, isDrum, isExpression, nonChannel, nonStop);
    }
    /**
     * 音源（パーカッション以外）
     * @param {Object} option
     * @returns {Object} 音をストップさせる関数を返す
     */
    createNote(option) {
        return createNote.call(this, option);
    }
    /**
     * パーカッション音源
     * @param {Object} option
     * @returns {Object} 音をストップさせる関数を返す
     */
    createPercussionNote(option) {
        return createPercussionNote.call(this, option);
    }
    setWaveData(no, array) {
        // array with lambda = this.context.sampleRate/this.baseFreq;
        const baseFreq=this.baseFreq;
        const sampleRate=this.context.sampleRate;
        this.fmtones[no]=this.context.createBuffer(1, array.length, sampleRate);
        const data=this.fmtones[no].getChannelData(0);
        for (let i=0;i<data.length;i++) {
            data[i]=array[i];
        }
    }
    setFrequency(oscillator, ..._freqTimes) {
        // _freqTimes = [周波数, 時刻, 周波数, 時刻, ....]
        const freqTimes=[];
        for (let i=0;i<_freqTimes.length;i+=2) {
            freqTimes.push({value:_freqTimes[i], time: _freqTimes[i+1]});
        }
        let target;
        if (oscillator.frequency) {// 本物のoccilatorの場合
            target=oscillator.frequency;
        } else {// Bufferの場合
            const baseFreq=this.baseFreq; // Buffer生音の周波数(init.jsも参照)
            target=oscillator.playbackRate;
            for (const e of freqTimes) {
                e.value /= baseFreq;//再生速度= 周波数/baseFreq
            }
        }
        if (freqTimes.length===1 && freqTimes[0].time==null) {
            target.value=freqTimes[0].value;
        } else {
            target.setValueAtTime(freqTimes[0].value, freqTimes[0].time);
            for (let i=1; i<freqTimes.length ;i++) {
                target.linearRampToValueAtTime(freqTimes[i].value, freqTimes[i].time);
            }
        }
    }
    // 停止管理関係 //
    stopAudioNode(tar, time, stopGainNode, isNoiseCut) {
        return stopAudioNode.call(this, tar, time, stopGainNode, isNoiseCut);
    }
    pushFunc(tar) {
        return pushFunc.call(this, tar);
    }
    clearFunc(tar1, tar2) {
        return clearFunc.call(this, tar1, tar2);
    }

    /**
     * Web MIDI API
     */
    startWebMIDI() {
        return startWebMIDI.call(this);
    }

    // インターフェース関係 //
    addEventListener(type, func) {
        // type = EventName (play, stop, noteOn, noteOff, songEnd)
        this.events.push({type: type, func: func});
    }
    removeEventListener(type, func) {
        for (let i = this.events.length; i >= 0; i--) {
            if (event.type == type && event.func === func) {
                this.events.splice(i, 1);
            }
        }
    }
    removeAllEventListener(type) {
        for (let i = this.events.length; i >= 0; i--) {
            if (event.type == type) {
                this.events.splice(i, 1);
            }
        }
    }
    fireEvent(type, option) {
        this.events.forEach((event) => {
            if (event.type == type) {
                try {
                    event.func(option);
                } catch(e) {
                    console.log(e);
                }
            }
        });
    }

    setOnSongEndListener(listener) { this.onSongEndListener = listener; }
    onSongEnd() {
        if (this.onSongEndListener) {
            const isStopFunc = this.onSongEndListener();
            if (isStopFunc) return;
        }
        if (this.settings.loop) {
            this.initStatus(true);
            if (this.settings.isCC111 && this.cc111Time != -1) {
                this.setStartTime(this.cc111Time);
            }
            this.play(true);
        }
    }
    gethannels() { return this.channels; }
    setChannels(channels) {
        channels.forEach((channel, idx) => {
            this.channels[idx] = channel;
        });
    }
    initChannels() {
        for (let i=0; i<16; i++) {
            this.channels[i] = [0,0,1];
        }
    }
    getMasterVolume() { return this.settings.masterVolume; }
    setMasterVolume(volume) {
        this.settings.masterVolume = volume;
        if (this.isStarted) {
            this.masterGainNode.gain.value = this.settings.masterVolume;
        }
    }
    isLoop() { return this.settings.loop; }
    setLoop(loop) { this.settings.loop = loop; }
    isWebMIDI() { return this.settings.isWebMIDI; }
    setWebMIDI(enable) { this.settings.isWebMIDI = enable; }
    isCC111() { return this.settings.isCC111; }
    setCC111(enable) { this.settings.isCC111 = enable; }
    isReverb() { return this.settings.isReverb; }
    setReverb(enable) { this.settings.isReverb = enable; }
    getReverbVolume() { return this.settings.reverbVolume; }
    setReverbVolume(volume) { this.settings.reverbVolume = volume; }
    isChorus() { return this.settings.isChorus; }
    setChorus(enable) { this.settings.isChorus = enable; }
    getChorusVolume() { return this.settings.chorusVolume; }
    setChorusVolume(volume) { this.settings.chorusVolume = volume; }
}

export default PicoAudio;
