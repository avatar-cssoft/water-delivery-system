
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization) {
      return respond({ error: 'Unauthorized.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the currently logged-in user.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authorization },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
      return respond({ error: 'Invalid session.' }, 401)
    }

    // Verify that the caller is an administrator.
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: profile, error: profileError } =
      await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError || profile?.role !== 'admin') {
      return respond({ error: 'Only admins can add employees.' }, 403)
    }

    const body = await req.json()

    const {
      firstName,
      lastName,
      middleInitial,
      phone,
      street,
      barangay,
      city,
      province,
      postalCode,
      email,
      password,
      department,
    } = body

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !phone?.trim() ||
      !street?.trim() ||
      !barangay?.trim() ||
      !city?.trim() ||
      !province?.trim() ||
      !postalCode?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return respond({ error: 'Please complete all required fields.' }, 400)
    }

    if (!['Management', 'Delivery'].includes(department)) {
      return respond({ error: 'Invalid department.' }, 400)
    }

    if (password.length < 8) {
      return respond({ error: 'Password must be at least 8 characters.' }, 400)
    }

    // Create employee account using the trusted Admin API.
    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,

      app_metadata: {
        account_type: 'employee',
      },

      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_initial: middleInitial?.trim() || '',
        phone: phone.trim(),
        street: street.trim(),
        barangay: barangay.trim(),
        city: city.trim(),
        province: province.trim(),
        postal_code: postalCode.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        department,
      },
    })

    if (error) {
      return respond({ error: error.message }, 400)
    }

    return respond({
      message: 'Employee created successfully.',
      userId: data.user.id,
    })
  } catch (error) {
    return respond({
      error: error instanceof Error
        ? error.message
        : 'Unexpected server error.',
    }, 500)
  }
})
