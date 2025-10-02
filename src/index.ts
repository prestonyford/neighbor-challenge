import express, { Request, Response } from 'express'
import listings from './listings.json' with { type: 'json' };

const app = express();

interface Vehicle {
	length: number,
	quantity: number
}

interface Listing {
	id: string,
	location_id: string,
	length: number,
	width: number,
	price_in_cents: number
}


const locationIDToListings = listings.reduce((acc, listing) => {
	acc[listing.location_id] ??= [];
	acc[listing.location_id].push(listing);
	return acc;
}, {});

function getAllCombinationsOfListings(listings: Listing[]) {
	const res: Listing[][] = [];
	const currentCombo: Listing[] = [];
	function helper(index: number) {
		if (currentCombo.length > 0) {
			res.push([...currentCombo]);
		}
		for (let i = index; i < listings.length; ++i) {
			currentCombo.push(listings[i]);
			helper(index + 1);
			currentCombo.pop();
		}
	}
	helper(0);
	return res;
}

function canListingsFitVehicles(listings: Listing[], vehicleLengths: number[]): boolean {
	const orientations = listings.map(l => [
		{ length: l.length, width: l.width },
		{ length: l.width, width: l.length }
	]);

	function canPlace(index: number, listings: Listing[]) {
		if (index >= vehicleLengths.length) {
			return true;
		}

		const vehicleLength = vehicleLengths[index];

		for (let i = 0; i < listings.length; i++) {
			for (const orient of orientations[i]) {
				if (orient.length >= vehicleLength && orient.width >= 10) {
					const newListings = [...listings];
					newListings[i] = { ...listings[i], length: orient.length - vehicleLength, width: orient.width };
					if (canPlace(index + 1, newListings)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	return canPlace(0, listings);
}

app.use(express.json());
app.post('/', (request: Request<{}, {}, Vehicle[]>, response) => {
	let vehicleLengths: number[] = [];
	for (const vehicle of request.body) {
		for (let i = 0; i < vehicle.quantity; i++) {
			vehicleLengths.push(vehicle.length);
		}
	}

	const results = [];

	for (const locationId in locationIDToListings) {
		const combos = getAllCombinationsOfListings(locationIDToListings[locationId]);
		let minPrice = Infinity;
		let minPriceCombo = null;

		for (const combo of combos) {
			const totalPrice = combo.reduce((sum, listing) => sum + listing.price_in_cents, 0);

			if (canListingsFitVehicles(combo, vehicleLengths)) {
				if (totalPrice < minPrice) {
					minPrice = totalPrice;
					minPriceCombo = combo.map(l => l.id);
				}
			}
		}

		if (minPriceCombo) {
			results.push({
				location_id: locationId,
				listing_ids: minPriceCombo,
				total_price_in_cents: minPrice
			});
		}
	}
	
	results.sort((a, b) => a.total_price_in_cents - b.total_price_in_cents);
	response.send(results.length);
});

export default app
