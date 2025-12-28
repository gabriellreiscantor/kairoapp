# CallKit - Modificações para TTS na Tela Nativa

## Objetivo
Fazer o TTS tocar enquanto a tela nativa de chamada do iPhone está ativa, e só encerrar a chamada depois que o TTS terminar.

## Problema Atual
Na linha 82 do `CallKitVoipPlugin.swift`, a chamada `endCall()` é executada **imediatamente** após o usuário atender:

```swift
public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    print("CXAnswerCallAction answers an incoming call")
    notifyEvent(eventName: "callAnswered", uuid: action.callUUID)
    endCall(uuid: action.callUUID)  // ❌ PROBLEMA: encerra imediatamente!
    action.fulfill()
}
```

## Solução

### Passo 1: Modificar o arquivo Swift

Após rodar `npx cap sync ios`, edite o arquivo:
```
ios/App/Pods/capacitor-plugin-callkit-voip/Plugin/CallKitVoipPlugin.swift
```

**Ou**, se você clonou o plugin, edite:
```
ios/App/App/plugins/CallKitVoipPlugin.swift
```

### Passo 2: Substituir o conteúdo

Substitua TODO o conteúdo do arquivo por este código:

```swift
import Foundation
import Capacitor
import UIKit
import CallKit
import PushKit
import AVFoundation

/**
 *  CallKit Voip Plugin provides native PushKit functionality with apple CallKit to capacitor
 *  MODIFIED: TTS plays on native call screen, call ends only after TTS finishes
 */
@objc(CallKitVoipPlugin)
public class CallKitVoipPlugin: CAPPlugin {

    private var provider: CXProvider?
    private let voipRegistry = PKPushRegistry(queue: nil)
    private var connectionIdRegistry: [UUID: CallConfig] = [:]
    private var activeCallUUID: UUID?  // Track the active call
    private var audioPlayer: AVAudioPlayer?  // For TTS playback

    @objc func register(_ call: CAPPluginCall) {
        voipRegistry.delegate = self
        voipRegistry.desiredPushTypes = [.voIP]
        let config = CXProviderConfiguration(localizedName: "Horah")
        config.maximumCallGroups = 1
        config.maximumCallsPerCallGroup = 1
        config.supportsVideo = false
        config.supportedHandleTypes = [.generic]
        
        // Configure ringtone
        config.ringtoneSound = "toqueios.caf"
        
        provider = CXProvider(configuration: config)
        provider?.setDelegate(self, queue: DispatchQueue.main)
        call.resolve()
    }

    public func notifyEvent(eventName: String, uuid: UUID) {
        if let config = connectionIdRegistry[uuid] {
            notifyListeners(eventName, data: [
                "id": config.id,
                "media": config.media,
                "name": config.name,
                "duration": config.duration,
                "connectionId": uuid.uuidString,
            ])
            // DON'T remove from registry here - we need it for endCallFromJS
        }
    }

    public func incomingCall(id: String, media: String, name: String, duration: String) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: name)
        update.hasVideo = false
        update.supportsDTMF = false
        update.supportsHolding = false
        update.supportsGrouping = false
        update.supportsUngrouping = false
        
        let uuid = UUID()
        activeCallUUID = uuid
        connectionIdRegistry[uuid] = .init(id: id, media: media, name: name, duration: duration)
        
        print("[CallKit-Swift] 📞 Incoming call: \(name) (id: \(id))")
        
        self.provider?.reportNewIncomingCall(with: uuid, update: update, completion: { error in
            if let error = error {
                print("[CallKit-Swift] ❌ Error reporting call: \(error)")
            } else {
                print("[CallKit-Swift] ✅ Call reported successfully")
            }
        })
    }

    // REMOVED: Don't end call automatically
    public func endCall(uuid: UUID) {
        let controller = CXCallController()
        let transaction = CXTransaction(action: CXEndCallAction(call: uuid))
        controller.request(transaction, completion: { error in
            if let error = error {
                print("[CallKit-Swift] ❌ Error ending call: \(error)")
            } else {
                print("[CallKit-Swift] ✅ Call ended successfully")
            }
        })
        
        // Cleanup
        self.activeCallUUID = nil
        self.connectionIdRegistry[uuid] = nil
        self.stopAudio()
    }
    
    // NEW: End call from JavaScript (after TTS finishes)
    @objc func endCallFromJS(_ call: CAPPluginCall) {
        print("[CallKit-Swift] 📱 endCallFromJS called from JavaScript")
        
        guard let uuid = activeCallUUID else {
            print("[CallKit-Swift] ⚠️ No active call to end")
            call.resolve(["ended": false, "reason": "no_active_call"])
            return
        }
        
        print("[CallKit-Swift] 🔚 Ending call: \(uuid)")
        endCall(uuid: uuid)
        call.resolve(["ended": true])
    }
    
    // NEW: Configure audio session for TTS during call
    @objc func configureAudioSession(_ call: CAPPluginCall) {
        print("[CallKit-Swift] 🔊 Configuring audio session for TTS")
        
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            // Use playAndRecord to allow audio during call
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
            
            print("[CallKit-Swift] ✅ Audio session configured")
            call.resolve(["configured": true])
        } catch {
            print("[CallKit-Swift] ❌ Audio session error: \(error)")
            call.resolve(["configured": false, "error": error.localizedDescription])
        }
    }
    
    // NEW: Play TTS audio during call
    @objc func playTTSAudio(_ call: CAPPluginCall) {
        guard let base64Audio = call.getString("audio") else {
            print("[CallKit-Swift] ❌ No audio data provided")
            call.resolve(["playing": false, "error": "no_audio_data"])
            return
        }
        
        print("[CallKit-Swift] 🎵 Playing TTS audio (length: \(base64Audio.count))")
        
        guard let audioData = Data(base64Encoded: base64Audio) else {
            print("[CallKit-Swift] ❌ Invalid base64 audio")
            call.resolve(["playing": false, "error": "invalid_base64"])
            return
        }
        
        do {
            // Configure audio session
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
            
            // Create and play audio
            audioPlayer = try AVAudioPlayer(data: audioData)
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
            
            print("[CallKit-Swift] ✅ TTS audio playing")
            call.resolve(["playing": true])
        } catch {
            print("[CallKit-Swift] ❌ Audio playback error: \(error)")
            call.resolve(["playing": false, "error": error.localizedDescription])
        }
    }
    
    // NEW: Stop TTS audio
    @objc func stopTTSAudio(_ call: CAPPluginCall) {
        print("[CallKit-Swift] 🔇 Stopping TTS audio")
        stopAudio()
        call.resolve(["stopped": true])
    }
    
    private func stopAudio() {
        audioPlayer?.stop()
        audioPlayer = nil
    }
}


// MARK: CallKit events handler

extension CallKitVoipPlugin: CXProviderDelegate {

    public func providerDidReset(_ provider: CXProvider) {
        print("[CallKit-Swift] Provider reset")
        activeCallUUID = nil
        connectionIdRegistry.removeAll()
        stopAudio()
    }

    public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        // User answered the call
        print("[CallKit-Swift] ====== CALL ANSWERED ======")
        print("[CallKit-Swift] UUID: \(action.callUUID)")
        
        // Notify JavaScript that call was answered
        notifyEvent(eventName: "callAnswered", uuid: action.callUUID)
        
        // ✅ IMPORTANT: DO NOT call endCall() here!
        // The call stays active so TTS can play on the native screen.
        // JavaScript will call endCallFromJS() after TTS finishes.
        
        // Configure audio session for TTS playback
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
            print("[CallKit-Swift] ✅ Audio session ready for TTS")
        } catch {
            print("[CallKit-Swift] ⚠️ Audio session setup error: \(error)")
        }
        
        action.fulfill()
    }

    public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        // Call ended (either by user or by endCallFromJS)
        print("[CallKit-Swift] ====== CALL ENDED ======")
        notifyEvent(eventName: "callEnded", uuid: action.callUUID)
        
        // Cleanup
        connectionIdRegistry[action.callUUID] = nil
        if activeCallUUID == action.callUUID {
            activeCallUUID = nil
        }
        stopAudio()
        
        action.fulfill()
    }

    public func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        // Outgoing call started
        print("[CallKit-Swift] ====== CALL STARTED ======")
        notifyEvent(eventName: "callStarted", uuid: action.callUUID)
        action.fulfill()
    }
    
    // Handle audio session interruptions
    public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        print("[CallKit-Swift] 🔊 Audio session activated")
    }
    
    public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        print("[CallKit-Swift] 🔇 Audio session deactivated")
        stopAudio()
    }
}

// MARK: PushKit events handler
extension CallKitVoipPlugin: PKPushRegistryDelegate {

    public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let parts = pushCredentials.token.map { String(format: "%02.2hhx", $0) }
        let token = parts.joined()
        print("[CallKit-Swift] 📲 VoIP Token: \(token.prefix(20))...")
        notifyListeners("registration", data: ["value": token])
    }

    public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        print("[CallKit-Swift] ====== VOIP PUSH RECEIVED ======")
        
        guard let id = payload.dictionaryPayload["id"] as? String else {
            print("[CallKit-Swift] ❌ Missing 'id' in payload")
            completion()
            return
        }
        
        let media = (payload.dictionaryPayload["media"] as? String) ?? "voice"
        let name = (payload.dictionaryPayload["name"] as? String) ?? "Evento"
        let duration = (payload.dictionaryPayload["duration"] as? String) ?? "0"
        
        print("[CallKit-Swift] id: \(id)")
        print("[CallKit-Swift] name: \(name)")
        print("[CallKit-Swift] media: \(media)")
        print("[CallKit-Swift] duration: \(duration)")
        
        // Notify JavaScript about the incoming push (for TTS pre-loading)
        notifyListeners("callStarted", data: [
            "eventId": id,
            "eventTitle": name,
            "eventTime": duration,
        ])
        
        self.incomingCall(id: id, media: media, name: name, duration: duration)
        completion()
    }
}

extension CallKitVoipPlugin {
    struct CallConfig {
        let id: String
        let media: String
        let name: String
        let duration: String
    }
}
```

### Passo 3: Atualizar o Plugin.m (Expor novos métodos)

Edite o arquivo `ios/App/Pods/capacitor-plugin-callkit-voip/Plugin/CallKitVoipPlugin.m`:

```objective-c
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CallKitVoipPlugin, "CallKitVoip",
    CAP_PLUGIN_METHOD(register, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endCallFromJS, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(configureAudioSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(playTTSAudio, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopTTSAudio, CAPPluginReturnPromise);
)
```

### Passo 4: Rebuild no Codemagic

Depois de fazer as alterações:

1. Commit e push para o GitHub
2. Trigger um novo build no Codemagic
3. Instale o novo .ipa

## O que muda no comportamento

| Antes | Depois |
|-------|--------|
| Usuário atende → `endCall()` imediato → vai pro app | Usuário atende → tela nativa fica ativa → TTS toca → JavaScript chama `endCallFromJS()` → chamada encerra |
| TTS nunca tocava na tela nativa | TTS toca enquanto a tela nativa está ativa |
| Evento `callAnswered` pode não chegar ao JS | Evento `callAnswered` é emitido e recebido corretamente |

## Fluxo Completo

```
1. VoIP Push chega
2. Plugin mostra tela nativa de chamada
3. Plugin emite "callStarted" → JS começa pre-load do TTS
4. Usuário atende na tela nativa
5. Plugin emite "callAnswered" → JS recebe
6. JS configura áudio e toca TTS
7. TTS termina → JS chama endCallFromJS()
8. Plugin encerra a chamada → tela nativa fecha
9. Plugin emite "callEnded"
```

## Troubleshooting

### TTS não toca
- Verifique se o audio session está configurado corretamente
- Verifique se o TTS está sendo baixado (logs do edge function)
- Tente o fallback de web audio

### Chamada encerra imediatamente
- Verifique se você removeu a linha `endCall(uuid: action.callUUID)` do `performAnswerCallAction`
- Verifique se os métodos novos estão expostos no .m

### callAnswered não dispara
- Verifique logs do Swift: `[CallKit-Swift] ====== CALL ANSWERED ======`
- Verifique se o plugin está inicializado antes da chamada chegar
