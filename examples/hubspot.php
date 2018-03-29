<?php

$hs_context = [
    'hutk' => $_COOKIE['hubspotutk'],
    'ipAddress' => $_SERVER['REMOTE_ADDR'],
    'pageUrl' => $_POST['pageUrl'],
    'pageName' => $_POST['pageName']
];

$hs_context_json = json_encode( $hs_context );

unset( $_POST['pageUrl'] );
unset( $_POST['pageName'] );

//Need to populate these variable with values from the form.
$str_post = "firstname=" . urlencode($firstname)
    . "&lastname=" . urlencode($lastname)
    . "&email=" . urlencode($email)
    . "&phone=" . urlencode($phonenumber)
    . "&company=" . urlencode($company)
    . "&hs_context=" . urlencode($hs_context_json); //Leave this one be

//replace the values in this URL with your portal ID and your form GUID
$endpoint = 'https://forms.hubspot.com/uploads/form/v2/297156/650ace7d-64d7-42f5-ad4f-d03505dd4f0a';

$ch = @curl_init();

@curl_setopt( $ch, CURLOPT_POST, true );
@curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query( $_POST ) );
@curl_setopt( $ch, CURLOPT_URL, $endpoint );
@curl_setopt( $ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/x-www-form-urlencoded'
));
@curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );

$response = @curl_exec( $ch ); //Log the response from HubSpot as needed.
$status_code = @curl_getinfo( $ch, CURLINFO_HTTP_CODE ); //Log the response status code

@curl_close( $ch );

echo json_encode( $response );
