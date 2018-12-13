export default function createNote(option) {
    var note = this.createBaseNote(option, false, true, false, true); // oscillatorのstopはこちらで実行するよう指定
    if(note.isGainValueZero) return null;

    var oscillator = note.oscillator;
    var gainNode = note.gainNode;
    var stopGainNode = note.stopGainNode;
    var isPizzicato = false;
    var isNoiseCut = false;
    var that = this;

    // 音色別の音色振り分け 書き方(ry
    switch(this.channels[note.channel][0]/10 || option.instrument){
        // Sine
        case 0.1:
        case  6: case 15: case 24: case 26: case 46: case 50: case 51:
        case 52: case 53: case 54: case 82: case 85: case 86:
        {
            oscillator.type = "sine";
            gainNode.gain.value *= 1.5;
            break;
        }
        // Square
        case 0.2:
        case  4: case 12: case 13: case 16: case 19: case 20: case 32: case 34: case 45: case 48: case 49:
        case 55: case 56: case 57: case 61: case 62: case 63: case 71: case 72: case 73: case 74: case 75:
        case 76: case 77: case 78: case 79: case 80: case 84:
        {
            oscillator.type = "square";
            gainNode.gain.value *= 0.8;
            break;
        }
        // Sawtooth
        case 0.3:
        case  0: case  1: case  2: case  3: case  6: case  7: case 17: case 18: case 21: case 22: case 23:
        case 27: case 28: case 29: case 30: case 36: case 37: case 38: case 39: case 40: case 41: case 42:
        case 43: case 44: case 47: case 59: case 64: case 65: case 66: case 67: case 68: case 69: case 70:
        case 71: case 82: case 87:
        {
            oscillator.type = "sawtooth";
            break;
        }
        // Triangle
        case 0.4:
        case  8: case  9: case 10: case 11: case 14: case 25: case 31: case 33: case 35: case 58: case 60:
        case 83: case 88: case 89: case 90: case 91: case 92: case 93: case 94: case 95:
        {
            oscillator.type = "triangle";
            gainNode.gain.value *= 1.5;
            break;
        }
        // Other - Square
        default:{
            oscillator.type = "square";
        }
    }

    // 音の終わりのプチプチノイズが気になるので、音の終わりに5ms減衰してノイズ軽減
    if((oscillator.type == "sine" || oscillator.type == "triangle")
        && !isPizzicato && note.stop - note.start > 0.01){
        isNoiseCut = true;
    }

    // 音色別の減衰　書き方ミスったなあ
    switch(this.channels[note.channel][1]/10 || option.instrument){
        // ピッチカート系減衰
        case 0.2:
        case 12: case 13: case 45: case 55:
        {
            isPizzicato = true;
            gainNode.gain.value *= 1.1;
            gainNode.gain.setValueAtTime(gainNode.gain.value, note.start);
            gainNode.gain.linearRampToValueAtTime(0.0, note.start+0.2);
            that.stopAudioNode(oscillator, note.start+0.2, stopGainNode);
            break;
        }
        // ピアノ程度に伸ばす系
        case 0.3:
        case  0: case  1: case  2: case  3: case  6: case  9: case 11: case 14: case 15:
        case 32: case 36: case 37: case 46: case 47:
        {
            gainNode.gain.value *= 1.1;
            gainNode.gain.setValueAtTime(gainNode.gain.value, note.start);
            var decay = (128-option.pitch)/64;
            gainNode.gain.setTargetAtTime(0, note.start, 2.5*decay*decay);
            that.stopAudioNode(oscillator, note.stop, stopGainNode, isNoiseCut);
            break;
        }
        // ギター系
        case 0.4:
        case 24: case 25: case 26: case 27: case 28: case 29: case 30: case 31: case 34:
        {
            gainNode.gain.value *= 1.1;
            gainNode.gain.setValueAtTime(gainNode.gain.value, note.start);
            gainNode.gain.linearRampToValueAtTime(0.0, note.start+1.0+note.velocity*4);
            that.stopAudioNode(oscillator, note.stop, stopGainNode, isNoiseCut);
            break;
        }
        // 減衰していくけど終わらない系
        case 0.5:
        case 4: case 5: case 7: case 8: case 10: case 33: case 35:
        {
            gainNode.gain.value *= 1.0;
            gainNode.gain.setValueAtTime(gainNode.gain.value, note.start);
            gainNode.gain.linearRampToValueAtTime(gainNode.gain.value*0.95, note.start+0.1);
            gainNode.gain.setValueAtTime(gainNode.gain.value*0.95, note.start+0.1);
            gainNode.gain.linearRampToValueAtTime(0.0, note.start+2.0+note.velocity*10);
            that.stopAudioNode(oscillator, note.stop, stopGainNode, isNoiseCut);
            break;
        }
        case 119: // Reverse Cymbal
        {
            gainNode.gain.value = 0;
            that.stopAudioNode(oscillator, note.stop, stopGainNode, isNoiseCut);
            var note2 = this.createBaseNote(option, true, true);
            if(note2.isGainValueZero) break;
            note2.oscillator.playbackRate.setValueAtTime((option.pitch+1)/128, note.start);
            note2.gainNode.gain.setValueAtTime(0, note.start);
            note2.gainNode.gain.linearRampToValueAtTime(1.3, note.start+2);
            that.stopAudioNode(note2.oscillator, note.stop, note2.stopGainNode);
            break;
        }
        default:{
            gainNode.gain.value *= 1.1;
            gainNode.gain.setValueAtTime(gainNode.gain.value, note.start);
            that.stopAudioNode(oscillator, note.stop, stopGainNode, isNoiseCut);
        }
    }

    return function(){
        that.stopAudioNode(oscillator, 0, stopGainNode, true);
        if (note2 && note2.oscillator) that.stopAudioNode(note2.oscillator, 0, note2.stopGainNode, true);
    };
}