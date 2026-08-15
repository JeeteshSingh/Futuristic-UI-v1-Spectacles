import {Singleton} from "SpectaclesInteractionKit.lspkg/Decorators/Singleton"

@Singleton
export class UIKitAudioPlayer {
  public static getInstance: () => UIKitAudioPlayer
  private inactiveAudioComponents: AudioComponent[]

  public constructor() {
    this.inactiveAudioComponents = []
  }

  public play(audioTrack: AudioTrackAsset, volume: number) {
    const audioComponent =
      this.inactiveAudioComponents.length > 0 ? this.inactiveAudioComponents.shift() : this.createAudioComponent()
    audioComponent.audioTrack = audioTrack
    audioComponent.volume = volume
    audioComponent.play(1)
    audioComponent.setOnFinish(() => {
      print(`Audio finished`)
      this.inactiveAudioComponents.push(audioComponent)
    })
  }

  private createAudioComponent(): AudioComponent {
    const audioObject = global.scene.createSceneObject("UIKitAudioPlayer")
    const audioComponent = audioObject.createComponent("Component.AudioComponent")
    audioComponent.playbackMode = Audio.PlaybackMode.LowPower
    return audioComponent
  }
}
