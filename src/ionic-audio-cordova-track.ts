import {IAudioTrack, IMessage, STATUS_MEDIA, createMessage} from './ionic-audio-interfaces';
import { NgZone} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';

declare let Media: any;

/**
 * Cordova Media audio track
 *
 * @export
 * @class CordovaAudioTrack
 * @constructor
 * @implements {IAudioTrack}
 */
export class CordovaAudioTrack implements IAudioTrack {
  private audio: any;
  public isPlaying: boolean = false;
  public isFinished: boolean = false;
  private _progress: number = 0;
  private _progressEventSent :boolean =false;
  private _completed: number = 0;
  private _duration: number;
  private _lastBufferedPercent: number = 0;
  private _volume: number = 1;
  private _id: number = null;
  private _isLoading: boolean = false;
  private _hasLoaded: boolean = false;
  private _timer: any = null;
  private _ngZone: NgZone;
  private _observer: Subject<IMessage>;
  private _lastPositions = [0 ,0 ,0];

  constructor(public src: string) {
    if (window['cordova'] === undefined || window['Media'] === undefined) {
      console.log('Cordova Media is not available');
      return;
    };
    this._ngZone = new NgZone({enableLongStackTrace: false});
    this.createAudio();
    // not necesary with cordova-background-mode. If you are not using that plugin,
    // you will need to use this instead.
    // document.addEventListener("resume", ( )=> {
    //  this.detectPaused();
    //  setTimeout(()=>{this.detectPaused()},400);
    //  setTimeout(()=>{this.detectPaused()},800);
    //  setTimeout(()=>{this.detectPaused()},12000);
    //  this.startTimer();
    // }, false);
  }

  private createAudio() {
    this._observer = this._observer || new Subject<IMessage>();

    this.audio = new Media(this.src, () => {
      console.log('Finished playback');
      this.stopTimer();
      this._ngZone.run(()=>{
        this._progress = 0;
        this._completed = 0;
        this._lastBufferedPercent = 0;
        this._hasLoaded = false;
        this.isFinished = true;
        this.isPlaying = false;
      });
      this.destroy();  // TODO add parameter to control whether to release audio on stop or finished
    }, (err) => {
      console.log(`Audio error => track ${this.src}`, err);
      this.isPlaying = false;
      this._observer.next(createMessage({value: err, status: STATUS_MEDIA.MEDIA_ERROR}));
    }, (status, extraArg) => {
      this._ngZone.run(()=>{
        console.log(`CordovaAudioTrack:status:`, status);
        switch (status) {
          case Media.MEDIA_STARTING:
            console.log(`Loaded track ${this.src}`);
            this._hasLoaded = true;
            break;
          case Media.MEDIA_RUNNING:
            console.log(`Playing track ${this.src}`);
            this.isPlaying = true;
            this._isLoading = false;
            break;
          case Media.MEDIA_PAUSED:
            console.log(`Paused track ${this.src}`);
            this.isPlaying = false;
            break
          case Media.MEDIA_STOPPED:
            console.log(`Stopped track ${this.src}`);
            this.isPlaying = false;
            break;
          case Media.MEDIA_STATE_ERROR:
            console.log(`Audio error state => track ${this.src}`, extraArg);
            this.isPlaying = false;
            this._lastBufferedPercent = 0;
            this.stopTimer();
            // this._observer.next(createMessage({value: extraArg, status: STATUS_MEDIA.MEDIA_ERROR}));
            break;
        }
      });
      this._observer.next(createMessage({value: this.audio, status: status}));
    }, (initialVolume: number) => {
      this._volume = initialVolume;
      console.log('Got initial volume: ', this._volume);
    });
  }

  private startTimer() {
    this._timer = setInterval(() => {
      if (!this.audio) { return; }
      if (this._duration === undefined || this._duration < 0) {
        let duration: number = this.audio.getDuration();
        if (duration > 0) {
          this._duration = Math.round(duration*100)/100;
          this._observer.next(createMessage({value: null, duration: this._duration, status: STATUS_MEDIA.MEDIA_DURATION_CHANGE}));
        }
      }

      const bufferedPercent = this.audio.getBufferedPercent();
      if (this._duration > 0 && bufferedPercent > 0 && bufferedPercent !== this._lastBufferedPercent) {
        this._lastBufferedPercent = bufferedPercent;
        const bufferedEnd = bufferedPercent * this._duration; // seconds

        const FakeTimeRanges = { length: 1, start: () => 0, end: () => bufferedEnd };
        this._observer.next(createMessage({value: { event: null, buffered: FakeTimeRanges, bufferedPercent }, status: STATUS_MEDIA.MEDIA_PROGRESS}));
      }

      this.audio.getCurrentPosition((position) => {
        this._ngZone.run(() => {
          if (position > -1) {
            this._progress = Math.round(position*100)/100;
            this.detectPaused();
            this._completed = this._duration > 0 ? Math.round(this._progress / this._duration * 100)/100 : 0;
            if (this._duration > 0 && this._progress > 0) {
              if (!this._progressEventSent) {
                this._progressEventSent = true;
                this._observer.next(createMessage({value: this.audio, status: STATUS_MEDIA.MEDIA_PROGRESS_ENABLE}));
              }

              this._observer.next(createMessage({value: this._completed, position: this._progress, status: STATUS_MEDIA.MEDIA_POSITION}));
            }
          }
        })},
        (e) => {
          console.log("Error getting position", e);
        }
      );
    }, 1000);
  }

  private stopTimer() {
    if (!this._timer) { return; }
    clearInterval(this._timer);
    this._timer = null;
  }

  private detectPaused() {
    const lastPosition = this._progress;

    if (lastPosition != 0
      && this._lastPositions[0] == lastPosition
      && this._lastPositions[1] == lastPosition
      && this._lastPositions[2] == lastPosition
    ) {
      this.pause();
    }

    this._lastPositions[0] = this._lastPositions[1];
    this._lastPositions[1] = this._lastPositions[2];
    this._lastPositions[2] = lastPosition;
  }

  /** public members */

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
    if (this._duration > 0 || !this.audio) { return this._duration; }
    // Otherwise, the track itself may have this recorded via the events
    // that do not get exposed:
    this._duration = this.audio.getDuration();
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
   * Gets current track buffered progress as a fraction [0, 1)
   *
   * @property bufferedPercent
   * @readonly
   * @type {number}
   */
  public get bufferedPercent(): number {
    if (this._lastBufferedPercent > 0 || !this.audio) { return this._lastBufferedPercent; }
    // Otherwise, the track itself may have this recorded via the events
    // that do not get exposed:
    const pct = this.audio.getBufferedPercent();
    this._lastBufferedPercent = pct;
    return pct;
  }

/**
 * Gets any errors logged by HTML5 audio
 *
 * @property error
 * @readonly
 * @type {MediaError}
 */
  public get error() : MediaError {
    return this.audio.error;
  }

  /**
 * Gets a boolean value indicating whether the current source can be played
 *
 * @property canPlay
 * @readonly
 * @type {boolean}
 */
  public get canPlay() : boolean {
    return true;
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
 * @property hadLoaded
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

  subscribe(): Observable<any> {
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
    this.isFinished = false;
    this.audio.play({ playAudioWhenScreenIsLocked: true });
    this.startTimer();
  }

  /**
 * Pauses current track
 *
 * @method pause
 */
  pause() {
    if (!this.isPlaying) return;
    console.log(`Pausing track ${this.src}`);
    this.isPlaying = false;
    this.audio.pause();
    this.stopTimer();
  }

  /**
 * Stops current track and releases audio
 *
 * @method stop
 */
  stop() {
    this.stopTimer();
    this.audio.stop();  // calls Media onSuccess callback
  }

  /**
 * Seeks to a new position within the track
 *
 * @method seekTo
 * @param {number} time the new position (milliseconds) to seek to
 */
  seekTo(time: number, byPercent: boolean = false) {

    let newTime = time;
    if (byPercent) {
      newTime = (time * this._duration) / 100;
    }

    // Cordova Media reports duration and progress as seconds, so we need to multiply by 1000
    this.audio.seekTo(newTime*1000);
    this._observer.next(createMessage({value: time, status: STATUS_MEDIA.MEDIA_SEEKTO}));
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
    this.audio.setVolume(this._volume);
  }

  /**
   * Releases audio resources
   *
   * @method destroy
   */
  destroy() {
    if (!this.audio) { return; }
    this.stopTimer();
    this.audio.release();
    this.audio = undefined;
    this._isLoading = false;
    this._hasLoaded = false;
    this.isFinished = false;
    this.isPlaying = false;
    this._progress = 0;
    this._completed = 0;
    this._lastBufferedPercent = 0;
    console.log(`Released track ${this.src}`);
  }
}
