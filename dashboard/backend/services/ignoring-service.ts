import { Ignoring, IIgnoring, IRectangle } from '../models/ignoring';
import { logger } from '../utils/logger.ts';

class IgnoringService {
    plainIgnoring(ignoring: IIgnoring | null) {
        if (!ignoring) {
            return ignoring;
        }

        return {
            pid: ignoring.pid,
            caseName: ignoring.caseName,
            rectangles: ignoring.rectangles.map((rectangle: IRectangle) => {
                return { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height };
            }),
        };
    }

    async createOrUpdateIgnoring(pid: string, caseName: string, rectangles: IRectangle[]) {
        let ignoring = await this.getIgnoring(pid, caseName);

        if (ignoring) {
            if (rectangles.length) {
                await ignoring.resetRectangles(rectangles);
            } else {
                logger.info(`IGNORING-SERVICE: rectangles is empty, delete current ignoring for pid=${pid}, caseName=${caseName}`);
                await this.deleteIgnoring(pid, caseName);
                ignoring = null;
            }
        } else {
            if (rectangles.length) {
                ignoring = new Ignoring();
                await ignoring.create(pid, caseName, rectangles);
            }
        }

        return this.plainIgnoring(ignoring);
    }

    async getIgnoring(pid: string, caseName: string) {
        return Ignoring.findOne({ pid: pid, caseName: caseName });
    }

    async getPlainIgnoring(pid: string, caseName: string) {
        return this.plainIgnoring(await this.getIgnoring(pid, caseName));
    }

    async deleteIgnoring(pid: string, caseName: string) {
        return Ignoring.deleteMany({ pid: pid, caseName: caseName });
    }

    async cleanProjectIgnoring(pid: string) {
        return Ignoring.deleteMany({ pid: pid });
    }
}

export const ignoringService = new IgnoringService();
