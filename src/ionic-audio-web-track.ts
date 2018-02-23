import {IAudioTrack ,IMessage, STATUS_MEDIA} from './ionic-audio-interfaces';
import {Injectable, Optional} from '@angular/core';
import {Observable} from 'rxjs/Observable';

declare let window;
window.AudioContext = window['AudioContext'] || window['webkitAudioContext'];

/**
 * Creates an HTML5 audio track
 *
 * @export
 * @class WebAudioTrack
 * @constructor
 * @implements {IAudioTrack}
 */

@Injectable()
export class WebAudioTrack implements IAudioTrack {
  private audio: HTMLAudioElement;
  public isPlaying: boolean = false;
  public isFinished: boolean = false;
  private _progress: number = 0;
  private _completed: number = 0;
  private _duration: number;
  private _id: number;
  private _isLoading: boolean;
  private _hasLoaded: boolean;
  private _observer: Observable<IMessage>;
  private _nextCallbackObserver = function(message:IMessage){
    //not subscribe yet
  };
  private _completeCallbackObserver = function(){
    //not subscribe yet
  };

  constructor(public src: string, @Optional() public preload: string = 'none') {
    // audio context not needed for now
    // @Optional() private ctx: AudioContext = undefined
    // this.ctx = this.ctx || new AudioContext();

    this.createAudio();
  }

  private createAudio() {
    this.audio = new Audio();
    this.audio.src = this.src;
    this.audio.preload = this.preload;
    //this.audio.controls = true;
    //this.audio.autoplay = false;
    this._observer = new Observable<IMessage>(observer => {
      this._nextCallbackObserver = (message) => {
        this._nextCallbackObserver(message);
      };

      this._completeCallbackObserver = () => {
        observer.complete()
      }
    });

    this.audio.addEventListener("timeupdate", (e) => {
      this.onTimeUpdate(e);
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_POSITION});
    }, false);

    this.audio.addEventListener("error", (err) => {
      console.log(`Audio error => track ${this.src}`, err);
      this.isPlaying = false;
      this._nextCallbackObserver({value: err, status: STATUS_MEDIA.MEDIA_ERROR});
    }, false);

    this.audio.addEventListener("canplay", (e) => {
      this._isLoading = false;
      this._hasLoaded = true;
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_STARTING});
    }, false);

    this.audio.addEventListener("playing", (e) => {
      console.log(`Playing track ${this.src}`);
      this.isFinished = false;
      this.isPlaying = true;
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_RUNNING});
    }, false);

    this.audio.addEventListener("pause", (e) =>{
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_PAUSED});
    }, false);


    this.audio.addEventListener("ended", (e) => {
      this.isPlaying = false;
      this.isFinished = true;
      this._progress = 0;
      this._completed = 0;
      this._hasLoaded = false;
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_STOPPED});
      //this.destroy();
      //observer.complete();
      console.log('Finished playback');
    }, false);

    this.audio.addEventListener("durationchange", (e:any) => {
      this._duration = e.target.duration;
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_DURATION_CHANGUE});
    }, false);

    this.audio.addEventListener("progress", (e) => {
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_PROGRESS});
    }, false);

    this.audio.addEventListener("suspend", (e) =>{
      this._nextCallbackObserver({value: e, status: STATUS_MEDIA.MEDIA_SUSPEND});
    }, false);

  }

  private onTimeUpdate(e: Event) {
    if (this.isPlaying && this.audio.currentTime > 0) {
      this._progress = this.audio.currentTime;
      this._completed = this.audio.duration > 0 ? Math.trunc (this.audio.currentTime / this.audio.duration * 100)/100 : 0;
    }
  }


  /**
   * Gets the track observable.
   */
  get observer(): Observable<any> {
    return this._observer;
  }

  /**
   * Gets the track id
   *
   * @property id
   * @type {number}
   */
  public get id() : number {
    return this._id;
  }

  /**
   * Sets the track id
   *
   * @property id
   */
  public set id(v : number) {
    this._id = v;
  }

  /**
   * Gets the track duration, or -1 if it cannot be determined
   *
   * @property duration
   * @readonly
   * @type {number}
   */
  public get duration() : number {
    return this._duration;
  }

  /**
   * Gets current track time (progress)
   *
   * @property progress
   * @readonly
   * @type {number}
   */
  public get progress() : number {
    return this._progress;
  }

  /**
   * Gets current track progress as a percentage
   *
   * @property completed
   * @readonly
   * @type {number}
   */
  public get completed() : number {
    return this._completed;
  }

  /**
   * Gets any errors logged by HTML5 audio
   *
   * @property error
   * @readonly
   * @type {MediaError}
   */
  public get error() : MediaError {
    return this.audio && this.audio.error;
  }

  /**
   * Gets a boolean value indicating whether the current source can be played
   *
   * @property canPlay
   * @readonly
   * @type {boolean}
   */
  public get canPlay() : boolean {
    let format = `audio/${this.audio.src.substr(this.audio.src.lastIndexOf('.')+1)}`;
    return this.audio && this.audio.canPlayType(format) != '';
  }


  /**
   * Gets a boolean value indicating whether the track is in loading state
   *
   * @property isLoading
   * @readonly
   * @type {boolean}
   */
  public get isLoading() : boolean {
    return this._isLoading;
  }


  /**
   * Gets a boolean value indicating whether the track has finished loading
   *
   * @property hasLoaded
   * @readonly
   * @type {boolean}
   */
  public get hasLoaded() : boolean {
    return this._hasLoaded;
  }

  /**
   * Gets observer for events of media
   * @property subscribe
   * @readonly
   * @type {Observable}
    */

  subscribe(): Observable<any>{
    return this._observer;
  }

  /**
   * Plays current track
   *
   * @method play
   */
  play() {
    if (!this.audio) {
      this.createAudio();
    }

    if (!this._hasLoaded) {
      console.log(`Loading track ${this.src}`);
      this._isLoading = true;
    }

    //var source = this.ctx.createMediaElementSource(this.audio);
    //source.connect(this.ctx.destination);
    this.audio.play();
  }

  /**
   * Pauses current track
   *
   * @method pause
   */
  pause() {
    if (!this.isPlaying) return;
    console.log(`Pausing track ${this.src}`);
    this.audio.pause();
    this.isPlaying = false;
  }

  /**
   * Stops current track and releases audio
   *
   * @method stop
   */
  stop() {
    if (!this.audio) return;
    this.pause();
    this.audio.removeEventListener("timeupdate", (e) => { this.onTimeUpdate(e); });
    this.isFinished = true;
    //this.destroy();
  }


  /**
   * Seeks to a new position within the track
   *
   * @method seekTo
   * @param {number} time the new position to seek to
   */
  seekTo(time: number) {
    if (!this.audio) return;
    this._nextCallbackObserver({value: time, status: STATUS_MEDIA.MEDIA_SEEKTO});
    this.audio.currentTime = time;
  }


  /**
   * Sets the volume of the current track. Valid values are (0, 1) inclusive.
   *
   * @method setVolume
   * @param v {number} the new volume to set. Valid values are (0,1) inclusive.
   */
  setVolume(v: number) {
    // Valid values are (0,1) inclusive.
    const volume = Math.min(Math.max(0, v), 1);
    this.audio.volume = volume;
  }


  /**
   * Releases audio resources
   *
   * @method destroy
   */
  destroy() {
    this.audio = undefined;
    console.log(`Released track ${this.src}`);
  }
}
