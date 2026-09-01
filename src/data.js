/* Vehicle reference data.
 *
 * Every figure below is the EPA combined rating pulled from the official
 * fueleconomy.gov web service. `epa` is the vehicle ID in that database:
 *   https://www.fueleconomy.gov/ws/rest/vehicle/<epa>
 * so any number here can be re-checked at the source in one request.
 *
 * Gas vehicles store `mpg` (EPA combined MPG).
 * Electric vehicles store `kwh100` (EPA combined kWh per 100 miles, measured at
 * the wall, so charging losses are already included). Miles per kWh is derived
 * as 100 / kwh100 rather than stored, to keep one source of truth.
 *
 * Every gas vehicle listed is rated on regular unleaded, so a single gas price
 * applies to all of them. Adding a midgrade or premium vehicle would need a
 * per-grade price to stay honest.
 */
const FLEET = [
  // --- Electric --------------------------------------- kWh/100mi ------------
  {n:"Lucid Air Pure RWD",            f:"ev",  year:2026, kwh100:23.141,  epa:49969, c:"Sedan"},
  {n:"Tesla Model 3 Standard RWD",    f:"ev",  year:2026, kwh100:24.3033, epa:50251, c:"Sedan"},
  {n:"Hyundai Ioniq 6 RWD",           f:"ev",  year:2025, kwh100:26.0,    epa:48362, c:"Sedan"},
  {n:"Tesla Model Y Long Range AWD",  f:"ev",  year:2026, kwh100:27.4959, epa:49744, c:"SUV"},
  {n:"Nissan Leaf 75 kWh",            f:"ev",  year:2026, kwh100:27.8215, epa:49975, c:"Hatchback"},
  {n:"Chevrolet Bolt EUV",            f:"ev",  year:2023, kwh100:29.4031, epa:45750, c:"Hatchback"},
  {n:"Kia EV6 Long Range RWD",        f:"ev",  year:2026, kwh100:29.5817, epa:50214, c:"SUV"},
  {n:"Hyundai Ioniq 5 RWD",           f:"ev",  year:2026, kwh100:30.0,    epa:49960, c:"SUV"},
  {n:"Ford Mustang Mach-E RWD ER",    f:"ev",  year:2026, kwh100:30.6702, epa:50205, c:"SUV"},
  {n:"Rivian R2 Performance AWD",     f:"ev",  year:2027, kwh100:32.1727, epa:50391, c:"SUV"},
  {n:"Rivian R1T Dual Large",         f:"ev",  year:2026, kwh100:42.8711, epa:49708, c:"Truck"},
  {n:"Ford F-150 Lightning ER",       f:"ev",  year:2025, kwh100:47.9143, epa:48705, c:"Truck"},

  // --- Gasoline (all regular unleaded) ---------------------- MPG ------------
  {n:"Toyota Prius",                  f:"gas", year:2026, mpg:57, epa:49301, c:"Hybrid"},
  {n:"Toyota Camry Hybrid FWD",       f:"gas", year:2026, mpg:51, epa:49823, c:"Hybrid"},
  {n:"Honda Civic Hybrid",            f:"gas", year:2026, mpg:49, epa:49289, c:"Hybrid"},
  {n:"Toyota Prius v",                f:"gas", year:2017, mpg:41, epa:37463, c:"Hybrid wagon"},
  {n:"Honda CR-V Hybrid FWD",         f:"gas", year:2026, mpg:40, epa:49353, c:"Hybrid SUV"},
  {n:"Toyota RAV4 Hybrid AWD",        f:"gas", year:2025, mpg:39, epa:48937, c:"Hybrid SUV"},
  {n:"Honda Civic 2.0L",              f:"gas", year:2026, mpg:36, epa:49287, c:"Sedan"},
  {n:"Honda CR-V FWD 1.5T",           f:"gas", year:2026, mpg:30, epa:49352, c:"SUV"},
  {n:"Subaru Outback AWD 2.5",        f:"gas", year:2026, mpg:27, epa:49531, c:"Wagon"},
  {n:"Honda Odyssey",                 f:"gas", year:2026, mpg:22, epa:49436, c:"Minivan"},
  {n:"Toyota Tacoma 4WD",             f:"gas", year:2026, mpg:21, epa:50091, c:"Truck"},
  {n:"Ram 1500 4WD 3.0L Turbo",       f:"gas", year:2026, mpg:20, epa:49420, c:"Truck"},
  {n:"Ford F-150 4WD 3.5L EcoBoost",  f:"gas", year:2026, mpg:19, epa:50099, c:"Truck"}
];

/* Fuel-price presets. Rough but current US figures; edit freely. */
const GAS_PRESETS = [
  {label:"US average",   v:3.20},
  {label:"California",   v:4.60},
  {label:"Gulf Coast",   v:2.75}
];
const KWH_PRESETS = [
  {label:"Home average",     v:0.170},
  {label:"Off-peak",         v:0.105},
  {label:"High-cost state",  v:0.320},
  {label:"DC fast charging", v:0.480},
  {label:"Free / solar",     v:0.000}
];
