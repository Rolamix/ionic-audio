import {IAudioTrack, IMessage, STATUS_MEDIA, createMessage} from './ionic-audio-interfaces';
import {Injectable, Optional} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';

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
  private _volume: number;
  private _id: number;
  private _isLoading: boolean;
  private _hasLoaded: boolean;
  private _observer: Subject<IMessage>;

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
    this._volume = this.audio.volume;
    //this.audio.controls = true;
    //this.audio.autoplay = false;
    // When the player is destroyed and then re-created, it should not create a new observer.
    // Do not orphan the existing _observer instance, if there is one -
    // it is likely that the track consumer is still subscribed to these events!
    this._observer = this._observer || new Subject<IMessage>();

    // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
    this.audio.addEventListener("timeupdate", (e) => {
      this.onTimeUpdate(e);
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_POSITION}));
    }, false);

    this.audio.addEventListener("error", (err) => {
      console.log(`Audio error => track ${this.src}`, err);
      this.isPlaying = false;
      this._observer.next(createMessage({value: err, status: STATUS_MEDIA.MEDIA_ERROR}));
    }, false);

    this.audio.addEventListener("canplay", (e) => {
      console.log(`Track can play (loaded): ${this.src}`);
      this._isLoading = false;
      this._hasLoaded = true;
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_STARTING}));
    }, false);

    this.audio.addEventListener("canplaythrough", (e) => {
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_CANPLAY_THRU}));
    }, false);

    this.audio.addEventListener("playing", (e) => {
      console.log(`Playing track ${this.src}`);
      this.isFinished = false;
      this.isPlaying = true;
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_RUNNING}));
    }, false);

    this.audio.addEventListener("pause", (e) => {
      console.log(`Paused track ${this.src}`);
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_PAUSED}));
    }, false);


    this.audio.addEventListener("ended", (e) => {
      this.isPlaying = false;
      this.isFinished = true;
      this._progress = 0;
      this._completed = 0;
      this._hasLoaded = false;
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_STOPPED}));
      //this.destroy();
      //observer.complete();
      console.log('Finished playback');
    }, false);

    this.audio.addEventListener('loadstart', (e) => {
      this._observer.next(createMessage({ value: e, status: STATUS_MEDIA.MEDIA_LOAD_STARTING}));
    });

    this.audio.addEventListener('loadedmetadata', (e) => {
      this._observer.next(createMessage({ value: e, status: STATUS_MEDIA.MEDIA_LOADED_METADATA}));
    });

    this.audio.addEventListener("durationchange", (e:any) => {
      this._duration = e.target.duration;
      this._observer.next(createMessage({value: e, duration: this._duration, status: STATUS_MEDIA.MEDIA_DURATION_CHANGE}));
    }, false);

    this.audio.addEventListener("progress", (e) => {
      console.log('Progress, buffered: ', this.audio.buffered);
      this._observer.next(createMessage({value: { event: e, buffered: this.audio.buffered }, status: STATUS_MEDIA.MEDIA_PROGRESS}));
    }, false);

    this.audio.addEventListener("suspend", (e) =>{
      // This means the player is waiting. Finished downloading, or paused for any other reason
      // except for user pausing. An example is a phone call.
      this._observer.next(createMessage({value: e, status: STATUS_MEDIA.MEDIA_SUSPEND}));
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
   * Gets the track duration in seconds, or -1 if it cannot be determined
   *
   * @property duration
   * @readonly
   * @type {number}
   */
  public get duration() : number {
    return this._duration;
  }

  /**
   * Gets current track time (progress) in seconds
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
    const playPromise = this.audio.play();
    if (playPromise.then && playPromise.catch) {
      playPromise.catch(() => {}); // swallow DOM errors.
    }
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
  seekTo(time: number, byPercent: boolean = false) {
    if (!this.audio) return;

    let newTime = time;
    if (byPercent) {
      newTime = (time * this._duration) / 100;
    }

    this._observer.next(createMessage({value: time, status: STATUS_MEDIA.MEDIA_SEEKTO}));
    this.audio.currentTime = newTime;
  }

  /**
   * Gets the current volume
   *
   * @property volume
   * @readonly
   * @type {number}
   */
  get volume() {
    return this._volume;
  }

  /**
   * Sets the volume of the current track. Valid values are (0, 1) inclusive.
   *
   * @method setVolume
   * @param v {number} the new volume to set. Valid values are (0,1) inclusive.
   */
  setVolume(v: number) {
    // Valid values are (0,1) inclusive.
    this._volume = Math.min(Math.max(0, v), 1);
    this.audio.volume = this._volume;
  }


  /**
   * Releases audio resources
   *
   * @method destroy
   */
  destroy() {
    this.audio = undefined;
    this._isLoading = false;
    this._hasLoaded = false;
    this.isFinished = false;
    this.isPlaying = false;
    this._progress = 0;
    this._completed = 0;
    console.log(`Released track ${this.src}`);
  }
}
