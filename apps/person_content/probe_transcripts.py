from youtube_transcript_api import YouTubeTranscriptApi

video_id = '8Qjt5ZMrRUM'

print('trying get_transcript')
try:
    data = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
    print('get_transcript ok', len(data))
    print(data[:2])
except Exception as e:
    print('get_transcript error', type(e).__name__, e)

print('trying list_transcripts')
try:
    transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
    print('list_transcripts ok')
    for transcript in transcripts:
        print('language', transcript.language_code, 'is_generated', transcript.is_generated)
        try:
            fetched = transcript.fetch()
            print('fetch ok', len(fetched))
            print(fetched[:2])
            break
        except Exception as e:
            print('fetch error', type(e).__name__, e)
except Exception as e:
    print('list_transcripts error', type(e).__name__, e)
