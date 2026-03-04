import { supabase } from './supabaseClient';

export interface LocationCity {
  city_id: number | string;
  city_name: string;
}

export interface LocationDepartment {
  dpto_id: string | number;
  dpto_name: string;
  cities: LocationCity[];
}

export interface LocationCountry {
  country_id: string | number;
  country_name: string;
  departments: LocationDepartment[];
}

const mapLocationHierarchy = (rows: any[]): LocationCountry[] => {
  const countriesMap = new Map<string, LocationCountry>();

  (rows || []).forEach((row) => {
    const countryName = row.loc_country || null;
    if (!countryName) return;

    if (!countriesMap.has(countryName)) {
      countriesMap.set(countryName, {
        country_id: countryName,
        country_name: countryName,
        departments: [],
      });
    }

    const country = countriesMap.get(countryName);
    if (!country) return;

    const departmentName = row.loc_department || null;
    if (!departmentName) return;

    let department = country.departments.find((dep) => dep.dpto_id === departmentName);

    if (!department) {
      department = {
        dpto_id: departmentName,
        dpto_name: departmentName,
        cities: [],
      };
      country.departments.push(department);
    }

    const cityName = row.loc_city || null;
    if (!cityName) return;

    department.cities.push({
      city_id: row.loc_id,
      city_name: cityName,
    });
  });

  return Array.from(countriesMap.values());
};

const LocationService = {
  async getLocations() {
    const { data, error } = await supabase
      .from('locations')
      .select('loc_id, loc_country, loc_department, loc_city')
      .order('loc_country', { ascending: true })
      .order('loc_department', { ascending: true })
      .order('loc_city', { ascending: true });

    return { data: { data: mapLocationHierarchy(data || []) }, error };
  },

  async addCountry(data: { country_name: string }) {
    const { data: row, error } = await supabase
      .from('locations')
      .insert([{ loc_country: data.country_name }])
      .select()
      .single();

    return { data: { data: row, status: error ? 'error' : 'success' }, error };
  },

  async editCountry(data: { id: string | number; country_name: string }) {
    const { id, ...payload } = data;
    const { data: row, error } = await supabase
      .from('locations')
      .update({ loc_country: payload.country_name })
      .eq('loc_country', id)
      .select();

    return { data: { data: row, status: error ? 'error' : 'success' }, error };
  },

  async delCountry(data: { id: string | number }) {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('loc_country', data.id);

    return { data: { status: error ? 'error' : 'success' }, error };
  },

  async addDepartment(data: { country_id: string | number; dpto_name: string }) {
    const { data: row, error } = await supabase
      .from('locations')
      .insert([
        {
          loc_country: data.country_id,
          loc_department: data.dpto_name,
        },
      ])
      .select()
      .single();

    return { data: { data: row, status: error ? 'error' : 'success' }, error };
  },

  async editDepartment(data: { id: string | number; dpto_name: string }) {
    const { id, ...payload } = data;
    const { data: row, error } = await supabase
      .from('locations')
      .update({ loc_department: payload.dpto_name })
      .eq('loc_department', id)
      .select();

    return { data: { data: row, status: error ? 'error' : 'success' }, error };
  },

  async delDepartment(data: { id: string | number }) {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('loc_department', data.id);

    return { data: { status: error ? 'error' : 'success' }, error };
  },

  async addCity(data: { dpto_id: string | number; city_name: string }) {
    const { data: countryRow } = await supabase
      .from('locations')
      .select('loc_country')
      .eq('loc_department', data.dpto_id)
      .limit(1)
      .maybeSingle();

    const { data: row, error } = await supabase
      .from('locations')
      .insert([
        {
          loc_country: countryRow?.loc_country || null,
          loc_department: data.dpto_id,
          loc_city: data.city_name,
        },
      ])
      .select()
      .single();

    return { data: { data: row, status: error ? 'error' : 'success' }, error };
  },

  async editCity(data: { id: number | string; city_name: string }) {
    const { id, ...payload } = data;
    const { data: row, error } = await supabase
      .from('locations')
      .update({ loc_city: payload.city_name })
      .eq('loc_id', id)
      .select();

    return { data: { data: row, status: error ? 'error' : 'success' }, error };
  },

  async delCity(data: { id: number | string }) {
    const { error } = await supabase.from('locations').delete().eq('loc_id', data.id);

    return { data: { status: error ? 'error' : 'success' }, error };
  },
};

export default LocationService;
