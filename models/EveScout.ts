export type ScoutSignature = {
  id: number;

  created_at: string;
  created_by_id: number;
  created_by_name: string;

  updated_at: string;
  updated_by_id: number;
  updated_by_name: string;

  completed_at: string;
  completed_by_id: number;
  completed_by_name: string;
  completed: boolean;


  wh_type: string;
  wh_exits_outward: boolean; // `True` if the wormhole type is on the Turnur/Thera side
  max_ship_size: 'small' | 'medium' | 'large' | 'xlarge' | 'capital' | 'unknown';
  expires_at: string;
  remaining_hours: number;
  signature_type: 'combat' | 'data' | 'gas' | 'relic' | 'wormhole' | 'unknown';

  out_system_id: 31000005 | 30002086;
  out_system_name: 'Thera' | 'Turnur';
  out_signature: string;

  in_system_id: number;
  in_system_class: 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c10' | 'c11' | 'c12' | 'c13' | 'c14' | 'c15' | 'c16' | 'c17' | 'c18' | 'c25' | 'drone' | 'exit' | 'hs' | 'jove' | 'ls' | 'ns' | 'unknown';
  in_system_name: string;
  in_region_id: number;
  in_region_name: string;
  in_signature: string;
}
