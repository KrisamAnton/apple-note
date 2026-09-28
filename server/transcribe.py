#!/usr/bin/env python3
"""Transkribiert eine Audiodatei mit faster-whisper und ordnet die Segmente
(falls ein Hugging-Face-Token via HF_TOKEN gesetzt ist) per pyannote.audio
den einzelnen Sprechern zu. Gibt genau eine JSON-Zeile auf stdout aus:
{"language": "de", "segments": [{"start":0.0,"end":2.1,"text":"...","speaker":"SPEAKER_00"}, ...]}
Fortschritt wird währenddessen als "PROGRESS:0.42" nach stderr geschrieben
(0.0-1.0), damit die Web-Oberfläche eine Prozentanzeige zeigen kann.
"""
import sys
import os
import json


def report_progress(value):
    print(f"PROGRESS:{value:.3f}", file=sys.stderr, flush=True)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Keine Audiodatei angegeben"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    language = os.environ.get("TRANSCRIBE_LANGUAGE", "de")
    model_size = os.environ.get("WHISPER_MODEL", "medium")
    hf_token = os.environ.get("HF_TOKEN", "")
    # Sprechererkennung braucht nochmal einen eigenen Durchlauf durchs Audio -
    # daher bekommt die reine Texterkennung nur einen Teil der Gesamtanzeige,
    # wenn danach noch Sprechererkennung folgt.
    transcribe_share = 0.7 if hf_token else 1.0

    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments_gen, info = model.transcribe(audio_path, language=language, vad_filter=True)
    duration = info.duration or 1.0
    segments = []
    for seg in segments_gen:
        segments.append({"start": seg.start, "end": seg.end, "text": seg.text.strip(), "speaker": "SPEAKER_00"})
        report_progress(min(seg.end / duration, 1.0) * transcribe_share)

    if hf_token:
        try:
            from pyannote.audio import Pipeline

            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1", use_auth_token=hf_token
            )
            diarization = pipeline(audio_path)
            turns = [
                {"start": turn.start, "end": turn.end, "speaker": speaker}
                for turn, _, speaker in diarization.itertracks(yield_label=True)
            ]
            for seg in segments:
                best_speaker = None
                best_overlap = 0.0
                for turn in turns:
                    overlap = min(seg["end"], turn["end"]) - max(seg["start"], turn["start"])
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_speaker = turn["speaker"]
                if best_speaker:
                    seg["speaker"] = best_speaker
        except Exception as exc:  # Sprechererkennung ist optional - bei Fehlern trotzdem den Text liefern
            print(f"Sprechererkennung fehlgeschlagen: {exc}", file=sys.stderr)

    report_progress(1.0)
    print(json.dumps({"language": info.language, "segments": segments}))


if __name__ == "__main__":
    main()
