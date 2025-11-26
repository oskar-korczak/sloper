"""FFmpeg video assembly service."""

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


async def _run_ffmpeg(cmd: list[str], error_msg: str) -> tuple[bytes, bytes]:
    """Run an FFmpeg command and handle errors."""
    logger.debug(f"Running FFmpeg: {' '.join(cmd)}")

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        logger.error(f"FFmpeg error: {stderr.decode()}")
        raise RuntimeError(f"{error_msg}: {stderr.decode()}")

    return stdout, stderr


async def create_image_video(
    image_path: Path,
    duration: float,
    resolution: tuple[int, int],
    frame_rate: int,
    output_path: Path,
) -> None:
    """Create a video from a single image with specified duration.

    Args:
        image_path: Path to the input image
        duration: Duration of the video segment in seconds
        resolution: Output resolution as (width, height)
        frame_rate: Output frame rate
        output_path: Path for the output video segment
    """
    width, height = resolution
    logger.info(f"Creating video segment from {image_path.name}: {duration}s")

    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(image_path),
        "-t",
        str(duration),
        "-vf",
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-r",
        str(frame_rate),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(output_path),
    ]

    await _run_ffmpeg(cmd, "Failed to create video segment")


async def concatenate_videos(
    video_paths: list[Path],
    output_path: Path,
) -> None:
    """Concatenate multiple videos into one.

    Args:
        video_paths: List of paths to video segments
        output_path: Path for the concatenated output video
    """
    logger.info(f"Concatenating {len(video_paths)} video segments")

    # Create concat file
    concat_file = output_path.parent / "concat_videos.txt"
    with open(concat_file, "w") as f:
        for path in video_paths:
            f.write(f"file '{path}'\n")

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-c",
        "copy",
        str(output_path),
    ]

    await _run_ffmpeg(cmd, "Failed to concatenate videos")


async def concatenate_audio(
    audio_paths: list[Path],
    output_path: Path,
) -> float:
    """Concatenate multiple audio files into one.

    Args:
        audio_paths: List of paths to audio files
        output_path: Path for the concatenated output audio

    Returns:
        Total duration of the concatenated audio in seconds
    """
    logger.info(f"Concatenating {len(audio_paths)} audio files")

    # Build filter complex for audio concat
    inputs = []
    filter_parts = []

    for i, path in enumerate(audio_paths):
        inputs.extend(["-i", str(path)])
        filter_parts.append(f"[{i}:a]")

    filter_complex = f"{''.join(filter_parts)}concat=n={len(audio_paths)}:v=0:a=1[out]"

    cmd = [
        "ffmpeg",
        "-y",
        *inputs,
        "-filter_complex",
        filter_complex,
        "-map",
        "[out]",
        "-c:a",
        "aac",
        str(output_path),
    ]

    await _run_ffmpeg(cmd, "Failed to concatenate audio")

    return await get_media_duration(output_path)


async def get_media_duration(path: Path) -> float:
    """Get duration of media file in seconds.

    Args:
        path: Path to the media file

    Returns:
        Duration in seconds
    """
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"FFprobe failed: {stderr.decode()}")

    return float(stdout.decode().strip())


async def merge_video_audio(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
) -> None:
    """Merge video with audio track.

    Args:
        video_path: Path to the silent video
        audio_path: Path to the audio track
        output_path: Path for the merged output video
    """
    logger.info("Merging video with audio track")

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        str(output_path),
    ]

    await _run_ffmpeg(cmd, "Failed to merge video and audio")


async def assemble_video(
    image_paths: list[Path],
    audio_paths: list[Path],
    scene_durations: list[float],
    resolution: tuple[int, int],
    frame_rate: int,
    output_path: Path,
) -> float:
    """Main assembly function - orchestrates the full video assembly pipeline.

    Pipeline:
    1. Create video segments from each image with specified duration
    2. Concatenate all video segments into a silent video
    3. Concatenate all audio files into a single audio track
    4. Merge the silent video with the audio track

    Args:
        image_paths: List of paths to input images
        audio_paths: List of paths to input audio files
        scene_durations: Duration for each scene (matches audio duration)
        resolution: Output video resolution as (width, height)
        frame_rate: Output video frame rate
        output_path: Path for the final output video

    Returns:
        Total duration of the assembled video in seconds
    """
    tmpdir = output_path.parent
    logger.info(
        f"Starting video assembly: {len(image_paths)} scenes, "
        f"{resolution[0]}x{resolution[1]}, {frame_rate}fps"
    )

    # 1. Create video segments for each image
    segment_paths = []
    for i, (img_path, duration) in enumerate(zip(image_paths, scene_durations)):
        segment_path = tmpdir / f"segment_{i}.mp4"
        await create_image_video(img_path, duration, resolution, frame_rate, segment_path)
        segment_paths.append(segment_path)

    # 2. Concatenate video segments
    silent_video_path = tmpdir / "silent_video.mp4"
    await concatenate_videos(segment_paths, silent_video_path)

    # 3. Concatenate audio files
    combined_audio_path = tmpdir / "combined_audio.aac"
    await concatenate_audio(audio_paths, combined_audio_path)

    # 4. Merge video and audio
    await merge_video_audio(silent_video_path, combined_audio_path, output_path)

    # Return final duration
    duration = await get_media_duration(output_path)
    logger.info(f"Video assembly complete: {duration:.1f}s")

    return duration
