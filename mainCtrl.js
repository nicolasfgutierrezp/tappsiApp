var app = angular.module('appMaps', ['uiGmapgoogle-maps', 'ngCookies']);

//Shared scope for cookies management
app.factory("sharedScope", function($rootScope, $cookies) {
	var scope = $rootScope.$new(true);
	//If cookie exists, load data object.
	var appCookie = $cookies.get('appCookie')? $cookies.getObject('appCookie') : null;

	scope.data = {
		markers : appCookie? appCookie.markers : [], //If cookie, add previous markers
		cities : appCookie? appCookie.cities : [], //If cookie, add previous cities
		updateCookies : function (){
			$cookies.putObject('appCookie',{markers : scope.data.markers, cities : scope.data.cities});
		}
	};
	return scope;
});

app.config(['uiGmapGoogleMapApiProvider', function (GoogleMapApi) {
	GoogleMapApi.configure({
		key: 'AIzaSyC_W0S82H7HA14a_5t2uGDYvQFDXjs_dNE',
		libraries: 'places'
	});
}])

app.controller('mainCtrl', ['$scope', 'uiGmapGoogleMapApi', 'uiGmapIsReady', 'sharedScope', function ($scope, GoogleMapApi, uiGmapIsReady, sharedScope) {
	angular.extend($scope, {
		control: {},
		events: {},
		map: {
			center: 
			{
				latitude: 0, 
				longitude: 0
			}, 
		  	zoom: 1
		},
	});
      
	GoogleMapApi.then(function(maps) {
		maps.visualRefresh = true;
	});

	$scope.markers = sharedScope.data.markers;
	$scope.cities = sharedScope.data.cities;
	$scope.updateCookies = sharedScope.data.updateCookies;
	var options = {
		enableHighAccuracy: true
	};
	//Get user current location
	navigator.geolocation.getCurrentPosition(function(pos) {
		var geocoder = new google.maps.Geocoder();
		var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
		//Get geocode of user city.
		geocoder.geocode({ 'latLng': latlng }, function (results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				var found = false;
				//Find
				results.forEach(function(result,i){
					if(result.types.indexOf('locality') >= 0 && !found){
						result.checked = true;
						var place = {
							id : result.place_id,
							geometry : result.geometry,
							formatted_address : result.formatted_address,
							name : result.formatted_address,
						}
						found = true;
						$scope.displayPlaces(place);
					}
				});
				if(!found){
					alert('Location not found');
				}
			} else {
				alert('Geocoder failed due to: ' + status);
			}
		});
		$scope.$apply();
	}, 
	function(error) {                    
		alert('Unable to get location: ' + error.message);
	}, options);

	//Create search box with google maps places autocomplete.
	uiGmapIsReady.promise().then(function (instances) {
		var map = instances[0].map;
		//init search control
		var searchInput = document.getElementById('pac-input');
		var options = {
			types: ['(cities)']
		};
		var searchBox = new google.maps.places.Autocomplete(searchInput, options);
		var searchDiv = document.getElementById('searchContainer');
		//Add search box listener
		searchBox.addListener('place_changed', function () {
	            	var place = searchBox.getPlace();
			if(place) $scope.displayPlaces(place);
		});
	});
	
	//Create marker and add to $scope.markers array
	//Create city and add to $scope.cities array
	$scope.displayPlaces = function (place) {
		if (!place.geometry) {
			console.log("No geometry defined");
			return;
		}
		//Evaluate if selected city already exists in list
		var exists = false;
		for(var i = 0; i < $scope.cities.length; i++){
			if(place.id == $scope.cities[i].id){
				exists = true;
				break;
			}
		}
		//If city doesn't exists, add it.
		if(!exists){
			$scope.markers.push({
				"id": place.id,
				"coords": {
					"latitude": place.geometry.location.lat(),
					"longitude": place.geometry.location.lng(),
				},
				"name": place.name,
				"address": place.formatted_address,
				"options": {
					labelContent: place.name,
					labelAnchor: '4 30',
					labelClass: 'marker-labels'
				},
			});
			$scope.cities.push({
				id : place.id,
				formatted_address: place.formatted_address,
				name : place.name,
				geometry : place.geometry,
				checked : true
			});
			$scope.resizeMap();
		}
		else { //If city exists, don't add it.
			console.log('city already added:', place.id);
		}
	};

	//Delete selected marker from marker array and city from cities array
	$scope.redrawMarkers = function(x){
		x.checked = false;
		for(var i=$scope.cities.length-1;i>=0;i--){
			if(!$scope.cities[i].checked){
				$scope.markers.splice(i, 1);
				$scope.cities.splice(i, 1);
			}
		}
		$scope.resizeMap();
	}

	//Adjust map bounds to current markers list.
	$scope.resizeMap = function(){
		var bounds = new google.maps.LatLngBounds();
		$scope.cities.forEach(function(city){
			if (city.geometry.viewport) {
				bounds.union(city.geometry.viewport);
			} else {
				bounds.extend(city.geometry.location);
			}
		})
		$scope.control.getGMap().fitBounds(bounds);
		$scope.updateCookies();
	}
}]);
