
import { HandHistory, GCPSettings } from '../types';
import { parseHeroHandDetails } from './statsParser';

// --- BigQuery Helpers ---

const mapHandToBigQueryRow = (hand: HandHistory) => {
    const { heroCards, netWin, position } = parseHeroHandDetails(hand);
    
    // Extract numerical pot size
    const potSizeNum = parseFloat(hand.potSize.replace(/[^0-9.]/g, '')) || 0;
    
    // Parse Stakes
    let sb = 0, bb = 0;
    const stakesMatch = hand.stakes.match(/\$?([\d.]+)\/\$?([\d.]+)/);
    if (stakesMatch) {
        sb = parseFloat(stakesMatch[1]);
        bb = parseFloat(stakesMatch[2]);
    }

    return {
        insertId: hand.id, // For deduplication
        json: {
            hand_id: hand.id,
            timestamp: new Date(hand.timestamp).toISOString(),
            hero_name: hand.hero,
            stakes: hand.stakes,
            blind_sb: sb,
            blind_bb: bb,
            position: position,
            hole_card_1: heroCards[0] || null,
            hole_card_2: heroCards[1] || null,
            net_won: netWin,
            pot_size: potSizeNum,
            video_url: hand.videoUrl || null,
            is_bomb_pot: hand.isBombPot || false,
            summary: hand.summary,
            tags: hand.tags || [],
            raw_history: hand.rawText
        }
    };
};

// --- API Interactions ---

export const uploadToGCS = async (
    hands: HandHistory[], 
    settings: GCPSettings
): Promise<boolean> => {
    if (!settings.bucketName || !settings.accessToken) {
        throw new Error("Missing GCS Bucket Name or Access Token");
    }

    const fileName = `pokervision_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const content = JSON.stringify(hands, null, 2);
    
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${settings.bucketName}/o?uploadType=media&name=${fileName}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: content
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "GCS Upload Failed");
        }

        return true;
    } catch (error) {
        console.error("GCS Upload Error:", error);
        throw error;
    }
};

export const streamToBigQuery = async (
    hands: HandHistory[],
    settings: GCPSettings
): Promise<{ inserted: number, failed: number }> => {
    if (!settings.projectId || !settings.datasetId || !settings.tableId || !settings.accessToken) {
        throw new Error("Missing BigQuery Configuration");
    }

    // Map all hands to BQ rows
    const rows = hands.map(mapHandToBigQueryRow);
    
    // BQ API has limit on request size, so we batch if necessary (simplified here to 1 batch for demo)
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${settings.projectId}/datasets/${settings.datasetId}/tables/${settings.tableId}/insertAll`;

    const body = {
        kind: "bigquery#tableDataInsertAllRequest",
        skipInvalidRows: true,
        ignoreUnknownValues: true,
        rows: rows
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || "BigQuery Insert Failed");
        }

        // Check for insert errors in response
        if (result.insertErrors && result.insertErrors.length > 0) {
            console.warn("BigQuery Partial Insert Errors:", result.insertErrors);
            const failedCount = result.insertErrors.length;
            return { inserted: rows.length - failedCount, failed: failedCount };
        }

        return { inserted: rows.length, failed: 0 };

    } catch (error) {
        console.error("BigQuery Streaming Error:", error);
        throw error;
    }
};
