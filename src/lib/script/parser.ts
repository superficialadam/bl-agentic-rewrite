/**
 * Scene heading parser: extracts scene_number, int_ext, location, time_of_day
 * from formatted headings like "201. INT. LOCATION - TIME"
 */

export interface ParsedSceneHeading {
	scene_number: number | null;
	int_ext: string | null;
	location: string | null;
	time_of_day: string | null;
}

const SCENE_HEADING_RE =
	/^(\d+)\.\s+(INT|EXT|INT\/EXT)\.\s+(.+?)(?:\s*-\s*(.+))?$/i;

export function parseSceneHeading(text: string): ParsedSceneHeading {
	const trimmed = text.trim();
	const match = trimmed.match(SCENE_HEADING_RE);

	if (!match) {
		return {
			scene_number: null,
			int_ext: null,
			location: trimmed || null,
			time_of_day: null
		};
	}

	return {
		scene_number: parseInt(match[1], 10),
		int_ext: match[2].toUpperCase(),
		location: match[3].trim(),
		time_of_day: match[4]?.trim() ?? null
	};
}
